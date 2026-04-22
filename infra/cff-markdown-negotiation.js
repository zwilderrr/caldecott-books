// CloudFront Function: markdown content negotiation for caldecottbooks.com
//
// Purpose: when a client sends `Accept: text/markdown` to `/` or `/index.html`,
// transparently serve `/index.md` with `Content-Type: text/markdown; charset=utf-8`
// and an `x-markdown-tokens` response header advertising the token estimate.
// Clients that do not send the header receive the normal HTML response.
//
// Why this exists:
//   AWS Amplify's built-in config (customHttp.yml, rewrites/redirects) cannot
//   match on request headers like `Accept`. The official agent-readiness
//   scanner at https://isitagentready.com specifically tests `Accept` header
//   negotiation, so HTTP-level content negotiation requires a CloudFront
//   Function (CFF) attached to the Amplify-managed CloudFront distribution.
//
// Deployment (manual, one-time):
//   1. AWS Console → CloudFront → Functions → Create function
//        Name:    caldecottbooks-markdown-negotiation-request
//        Runtime: cloudfront-js-2.0
//        Paste:   the `handlerRequest` function below (rename to `handler`).
//      Publish.
//   2. Create a second function for the response phase:
//        Name:    caldecottbooks-markdown-negotiation-response
//        Runtime: cloudfront-js-2.0
//        Paste:   the `handlerResponse` function below (rename to `handler`).
//        Before pasting, substitute TOKENS_PLACEHOLDER with the integer from
//        `index.md.tokens` in the repo root (the build script writes it).
//      Publish.
//   3. CloudFront → find the distribution backing the Amplify app
//      (domain ends in `.cloudfront.net`; Amplify lists it as "Hosting
//      distribution" in the app settings).
//        Behaviors → default (`*`) → Edit.
//        Function associations:
//          Viewer request  → caldecottbooks-markdown-negotiation-request
//          Viewer response → caldecottbooks-markdown-negotiation-response
//      Save.
//   4. Wait for the distribution to finish deploying (5–10 min).
//   5. Test:
//        curl -sH 'Accept: text/markdown' -i https://caldecottbooks.com/ | head
//      Expect: `content-type: text/markdown; charset=utf-8` and a markdown body.
//        curl -si https://caldecottbooks.com/ | head
//      Expect: `content-type: text/html` and HTML body.
//
// Re-deploy whenever `index.md.tokens` changes (substitute new value and
// publish the response function again).
//
// -----------------------------------------------------------------------------
// VIEWER REQUEST — rewrite `/` or `/index.html` to `/index.md` when the
// client accepts text/markdown. Stash a hint on the request so the viewer
// response function knows whether to override Content-Type.
// -----------------------------------------------------------------------------
function handlerRequest(event) {
  var request = event.request;
  var headers = request.headers;
  var accept = headers.accept && headers.accept.value;
  if (!accept) return request;
  if (accept.toLowerCase().indexOf("text/markdown") === -1) return request;

  var uri = request.uri;
  if (uri === "/" || uri === "/index.html") {
    request.uri = "/index.md";
    // Viewer-response sees the modified uri; that alone is a reliable signal.
  }
  return request;
}

// -----------------------------------------------------------------------------
// VIEWER RESPONSE — if the client asked for markdown and we served /index.md,
// force the correct Content-Type and advertise the token estimate.
// Replace TOKENS_PLACEHOLDER with the integer from `index.md.tokens` before
// publishing.
// -----------------------------------------------------------------------------
function handlerResponse(event) {
  var request = event.request;
  var response = event.response;
  var accept = request.headers.accept && request.headers.accept.value;
  var wantsMarkdown =
    accept && accept.toLowerCase().indexOf("text/markdown") !== -1;

  if (wantsMarkdown && request.uri === "/index.md") {
    response.headers["content-type"] = {
      value: "text/markdown; charset=utf-8",
    };
    response.headers["x-markdown-tokens"] = { value: "TOKENS_PLACEHOLDER" };
    response.headers["vary"] = { value: "Accept" };
  }
  return response;
}
