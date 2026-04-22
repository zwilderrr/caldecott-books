# infra/

Deployment artifacts that live outside the Amplify build. Currently just the
CloudFront Function for markdown content negotiation.

## Why a CloudFront Function?

The site is hosted on AWS Amplify. Amplify's own config (`customHttp.yml`,
rewrites, redirects) can match on path but **cannot match on request headers**
like `Accept`. The "Is It Agent Ready?" scanner
(<https://isitagentready.com>) specifically checks whether the site serves
`text/markdown` when the request carries `Accept: text/markdown`. To pass that
check, we attach a CloudFront Function (CFF) to the Amplify-managed
distribution.

Until the CFF is deployed, markdown is still discoverable:

- `<link rel="alternate" type="text/markdown" href="/index.md">` in `<head>`
- `Link: </index.md>; rel="alternate"; type="text/markdown"` HTTP header
  (served via `customHttp.yml`)
- `/index.md` direct fetch with `Content-Type: text/markdown`

These get agents most of the way there. The CFF closes the last mile.

## Deploy the CFF

Full inline instructions are at the top of
[`cff-markdown-negotiation.js`](./cff-markdown-negotiation.js). Summary:

1. Run `node scripts/build-md.mjs` in the repo root. Note the integer in
   `index.md.tokens`.
2. AWS Console → CloudFront → Functions → Create two functions using the
   runtime **cloudfront-js-2.0**:
   - `caldecottbooks-markdown-negotiation-request`: paste `handlerRequest`,
     rename to `handler`, publish.
   - `caldecottbooks-markdown-negotiation-response`: paste `handlerResponse`,
     rename to `handler`, replace `TOKENS_PLACEHOLDER` with the token integer,
     publish.
3. Find the CloudFront distribution fronting the Amplify app (listed in the
   Amplify console under the app's domain details, or search CloudFront for
   the `*.cloudfront.net` domain Amplify assigns).
4. Edit the default (`*`) behavior → Function associations:
   - Viewer request → the request function
   - Viewer response → the response function
5. Save, wait for deployment.

## Verify

No header (baseline HTML):

```
curl -si https://caldecottbooks.com/ | head -20
```

Expect `content-type: text/html`.

With `Accept: text/markdown`:

```
curl -sH 'Accept: text/markdown' -i https://caldecottbooks.com/ | head -20
```

Expect `content-type: text/markdown; charset=utf-8`, `x-markdown-tokens: <N>`,
and a markdown body starting with `# Caldecott Medal Winners`.

Run the official scanner:

```
curl -sX POST https://isitagentready.com/api/scan \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://caldecottbooks.com"}' \
  | jq .checks.contentAccessibility.markdownNegotiation.status
```

Expect `"pass"`.

## Re-deploy when data changes

Whenever `index.md.tokens` changes (i.e. after re-running `build-md.mjs` with
new data), update the `x-markdown-tokens` value in the response function and
publish. The request function does not need changes.
