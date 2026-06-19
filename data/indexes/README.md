# Search index placeholders

Future search indexes belong in this directory and should stay out of the startup bundle. Split indexes by domain when they become large:

- `vocabulary`: lexical forms, lemmas, parsing tags, and frequency fields.
- `glosses`: gloss terms keyed by source vocabulary or lexicon identifiers.
- `grammar`: lesson titles, headings, parse tags, and short excerpts that are safe to index.
- `bible`: book/chapter/verse references and normalized tokens for licensed text only.

Expected lightweight shape:

```json
{
  "schemaVersion": 1,
  "id": "greek-vocabulary-index",
  "type": "vocabulary",
  "language": "greek",
  "sourceContentIds": ["core-vocabulary"],
  "entries": [
    { "term": "logos", "ref": "vocab:g-logos", "tokens": ["logos", "word"], "weight": 1 }
  ]
}
```

Large indexes should be listed in `data/metadata/content-manifest.json` and loaded with `contentLoader.loadSearchIndex()` or `contentLoader.loadById()` only when a feature needs them.
