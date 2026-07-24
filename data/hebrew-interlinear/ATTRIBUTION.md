# Hebrew interlinear attribution and modifications

Primary source: [MACULA Hebrew Linguistic Datasets](https://github.com/Clear-Bible/macula-hebrew/), commit `47db250bd55d0d8577f2a94fba114ef16c35b23c`, retrieved 2026-07-24.

Required attribution: “MACULA Hebrew Linguistic Datasets, available at https://github.com/Clear-Bible/macula-hebrew/”.

Occurrence glosses: Cherith Glosses for the Hebrew Old Testament, by Andi Wu, Copyright © 2022 Cherith Analytics. CC BY 4.0.

Puritan Parser imports only the MACULA TSV fields listed in `source-manifest.json`. It collapses whitespace in the English occurrence-gloss field, groups morph rows with the same orthographic-word reference, derives an unpointed search/audit form, encodes chapter records as deterministic field-mapped arrays, and aligns those records to the unchanged OSHB/WLC Reader surface. Missing glosses are not filled. Ketiv forms retained by the Reader are linked to their qere records but receive no qere gloss.

STEPBible data was inspected at commit `b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39` to verify qere/ketiv and segmentation concepts. No STEPBible fields are distributed in this dataset.
