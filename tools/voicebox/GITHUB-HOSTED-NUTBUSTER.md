# GitHub-hosted NUTBUSTER private voice production

Workflow: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/workflows/nutbuster-remote-voice.yml

This job runs on an ephemeral GitHub-hosted Ubuntu runner. It does NOT install anything on the user's Windows PC. It installs only the public LuxTTS engine and its upstream dependencies on the temporary GitHub machine, downloads a private authorized voice recording, renders six preview or all 74 original-announcer clips, and produces a review WAV reel plus clip hashes.

Both the HB-TTRPG-tools and NUTBUSTER-R repositories are public. Never commit the original voice WAV, a plaintext audio ZIP, a personal token, or a private signed URL to the repositories. The job requires two GitHub Actions secrets, which must be configured through secure GitHub Settings:

* VOICEBOX_REFERENCE_URL — a time-limited private HTTPS direct-download URL for the owner-authorized source recording. The link must remain valid until the job retrieves the file. This is a URL, not Google Drive credentials.
* VOICEBOX_EXPORT_PASSPHRASE — strong random passphrase of at least 24 characters for symmetric GPG encryption of the review ZIP before it is uploaded as a workflow artifact.

The workflow deliberately fails BEFORE installing dependencies if either secret is missing. There is no fallback to a public voice recording and no unencrypted audio upload. Plaintext inputs and outputs are deleted from the ephemeral runner. The encrypted artifact ends in .gpg, is retained for seven days, and requires the retained decryption passphrase to review.

Select preview for the first real run; review the six decrypted clips before generating all 74. The workflow does not overwrite any live game audio or deploy a release.

Current connector limitation: the GitHub connection used in this conversation can commit repository files, but it cannot configure repository Actions secrets or dispatch a fresh workflow run. Committing this workflow does NOT mean that a run was started or that audio was generated. The secure reference URL and passphrase are not configured by these commits. This remote workflow is separate from the legacy self-hosted pipeline. All speech-engine installations happen on GitHub-hosted infrastructure.
