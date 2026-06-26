# ArbotFlash v0.14.0 — TIDFC framework reset

This package resets the public ArbotFlash UI back onto the verified Tree ID Trainer v15.23 framework while preserving ArbotFlash as an independent project.

Included:
- TIDFC layout, skins, buttons and speech module structure
- TIDFC `/api/speech.js` AI voice endpoint
- ArbotFlash 80-taxon data with profile fields
- 80 local licensed specimen images in `media/thumbs`
- independent ArbotFlash footer

Important for AI voice: set `OPENAI_API_KEY` in Vercel Project Settings → Environment Variables, then redeploy. Without that key, the AI voice endpoint will correctly report that AI voices are not connected.
