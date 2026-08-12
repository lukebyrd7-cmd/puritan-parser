# EB Garamond Greek web fonts

The two WOFF2 files are the Greek and Greek Extended subsets served by Google Fonts for EB Garamond v33. They preserve the v1.9.3 Greek Reader face while making it deterministic in an installed PWA with no network.

- Family: EB Garamond
- Upstream: https://fonts.google.com/specimen/EB+Garamond
- CDN release: `s/ebgaramond/v33`
- Styles used: normal variable weight 400–800
- License: SIL Open Font License 1.1, copied in `EB-Garamond-OFL.txt`

The service worker precaches both files with the current application version. Hebrew retains its existing font stack and does not use these Greek-only subsets.
