import copy
import json
import tempfile
import unittest
from pathlib import Path
import scene_memory as m

EXAMPLE = Path(__file__).with_name("autumn-conversation.json")

class SceneMemoryTests(unittest.TestCase):
    def setUp(self):
        self.scene = json.loads(EXAMPLE.read_text(encoding="utf8"))

    def test_a_b_c_hear_and_d_does_not(self):
        result=m.apply_scene(m.blank(),self.scene)
        for actor in "ABC":
            self.assertEqual(len(result["characters"][actor]["memories"]),2)
            self.assertEqual(len(result["characters"][actor]["claims_heard"]),4)
            self.assertEqual(result["characters"][actor]["memories"][1]["speaker"],"B")
            self.assertEqual(result["characters"][actor]["presence"][0]["recognized"],["A","B","C"])
        self.assertEqual(result["characters"]["D"]["memories"],[])
        self.assertEqual(result["characters"]["D"]["presence"],[])

    def test_witness_maintains_attribution_and_correction(self):
        c=m.apply_scene(m.blank(),self.scene)["characters"]["C"]
        self.assertEqual(c["claims_heard"][2]["source_speaker"],"B")
        self.assertEqual(c["claims_heard"][2]["corrects"],["autumn-001/turn1/c2"])
        self.assertEqual(c["claims_heard"][2]["objective_truth"],"not-established")
        self.assertEqual(c["beliefs"][0]["belief"],"accepts")
        self.assertEqual(c["memories"][1]["addressed_to"],["A"])

    def test_directed_beliefs_do_not_spread_automatically(self):
        state=m.apply_scene(m.blank(),self.scene)
        self.assertEqual([x["holder"] for x in state["belief_history"]],["A","C"])
        self.assertEqual(state["characters"]["B"]["beliefs"],[])
        self.assertEqual(state["characters"]["D"]["beliefs"],[])

    def test_replay_is_idempotent_and_conflicting_revisions_rejected(self):
        first=m.apply_scene(m.blank(),self.scene)
        self.assertEqual(m.apply_scene(first,self.scene),first)
        new=copy.deepcopy(self.scene)
        new["turns"][0]["text"]+=" New text"
        with self.assertRaisesRegex(m.SceneError,"different content"):
            m.apply_scene(first,new)

    def test_presence_does_not_force_audibility(self):
        scene=copy.deepcopy(self.scene)
        scene["turns"][1]["heard_by"]=["A","B"]
        scene["belief_updates"]=scene["belief_updates"][:1]
        result=m.apply_scene(m.blank(),scene)
        c=result["characters"]["C"]
        self.assertEqual(len(c["memories"]),1)
        self.assertEqual(len(c["claims_heard"]),2)
        self.assertEqual(c["presence"][0]["recognized"],["A","B","C"])

    def test_unheard_claim_cannot_update_absent_actor_belief(self):
        scene=copy.deepcopy(self.scene)
        scene["belief_updates"].append({"id":"bogus","holder":"D","about":"B",
            "claim_ref":"autumn-001/turn2/c1","belief":"accepts",
            "confidence":"high","reason":"Omniscient leakage"})
        with self.assertRaisesRegex(m.SceneError,"lacks access"):
            m.apply_scene(m.blank(),scene)

    def test_unknown_references_and_duplicate_actors_rejected(self):
        scene=copy.deepcopy(self.scene)
        scene["turns"][1]["claims"][0]["corrects"]=["fake/turn/id"]
        with self.assertRaisesRegex(m.SceneError,"correction requires"):
            m.apply_scene(m.blank(),scene)
        scene=copy.deepcopy(self.scene)
        scene["turns"][0]["heard_by"].append("Z")
        with self.assertRaisesRegex(m.SceneError,"unknown"):
            m.apply_scene(m.blank(),scene)

    def test_cued_recall_is_not_perfect_memory(self):
        ledger=m.apply_scene(m.blank(),self.scene)
        result=m.recall(ledger,"C","natural curls")
        self.assertGreaterEqual(result["total"],1)
        self.assertEqual(result["matches"][0]["memory_id"],"autumn-001/turn2")
        self.assertIn("not-guaranteed",result["matches"][0]["status"])
        self.assertEqual(m.recall(ledger,"D","natural curls")["total"],0)

    def test_later_recall_preserves_first_snapshot(self):
        before=m.apply_scene(m.blank(),self.scene)
        subsequent={"schema":m.SCENE,"id":"winter-002","series":"neutral-fiction",
            "segment":"chapter-12","source_ref":"winter-002","canon_status":"provisional",
            "characters":["A","C"],"presence_observations":[],
            "turns":[{"id":"one","speaker":"C","addressed_to":["A"],"heard_by":["A","C"],
                      "text":"Remember B's curls?","claims":[]}],
            "reactivations":[{"holder":"C","memory_id":"autumn-001/turn2","hook":"winter hair"}]}
        after=m.apply_scene(before,subsequent)
        self.assertEqual(len(after["characters"]["C"]["reactivations"]),1)
        self.assertEqual(len(before["characters"]["C"]["reactivations"]),0)
        self.assertEqual(len(after["characters"]["A"]["reactivations"]),0)

    def test_cannot_recall_unheard_event(self):
        earlier=m.apply_scene(m.blank(),self.scene)
        later={"schema":m.SCENE,"id":"winter-003","series":"neutral-fiction",
            "segment":"chapter-13","source_ref":"winter-003","canon_status":"draft",
            "characters":["D"],"presence_observations":[],
            "turns":[{"id":"one","speaker":"D","addressed_to":[],"heard_by":["D"],
                      "text":"Nothing was heard.","claims":[]}],
            "reactivations":[{"holder":"D","memory_id":"autumn-001/turn2","hook":"impossible"}]}
        with self.assertRaisesRegex(m.SceneError,"did not observe"):
            m.apply_scene(earlier,later)

    def test_cli_only_writes_new_snapshots(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            input_path=root/"scene.json"
            output_path=root/"ledger.json"
            input_path.write_text(json.dumps(self.scene),encoding="utf8")
            self.assertEqual(m.main(["apply","--scene",str(input_path),"--output",str(output_path)]),0)
            before=output_path.read_bytes()
            with self.assertRaises(SystemExit) as caught:
                m.main(["apply","--scene",str(input_path),"--output",str(output_path)])
            self.assertEqual(caught.exception.code,2)
            self.assertEqual(before,output_path.read_bytes())

if __name__=="__main__":
    unittest.main()
