(() => {
  function spell(s){
    return `${s.name}\nSuggested Spell Level: ${s.suggestedLevel.label}\nTheme: ${s.theme.label}\nCasting Tradition: ${s.castingTradition.label}\nCompetence / Complexity: ${s.competence.label}\nMoral Tone: ${s.moralTone.label}\nOddity Severity: ${s.odditySeverity.label}\nConcept Bias: ${s.conceptBias.label}\nSubject: ${s.subject}\nPhenomenon: ${s.phenomenon}\n\nMANIFESTATION\n${s.manifestation}\n\nCASTING PROCEDURE\n${s.casting}\n\nPRIMARY THEMATIC EFFECT\n${s.primaryEffect}\n\nSECONDARY EFFECT\n${s.secondaryEffect}\n\nKNOCK-ON EFFECT\n${s.knockOnEffect}\n\nAFTEREFFECT\n${s.afterEffect}\n\nSUGGESTED-LEVEL RATIONALE\n${s.suggestedLevel.rationale}\n\nRUMORED ORIGIN\n${s.origin}\n\nGM USE\n${s.gmUse}\n\n${s.mechanicalStatus}`;
  }
  window.HBEccentricSpellText={spell};
})();
