#!/usr/bin/env bash
#
# Build a local, renderable review copy of the approved prototypes.
#
# WHY THIS IS NEEDED
# ------------------
# The .dc.html prototypes load React, ReactDOM and Babel from unpkg.com and
# fonts from Google Fonts. Environments whose network policy allows package
# registries but not arbitrary hosts deny those, and the prototype then renders
# as unexpanded {{ template }} placeholders rather than as a screen — which
# makes screenshot comparison impossible.
#
# This fetches the SAME PINNED VERSIONS the prototypes ask for from the npm
# registry, and the same font families from @fontsource, then writes a copy of
# each prototype whose script and link tags point at those local files.
#
# **kkl-design is never modified.** The copy lives in its own directory and the
# baseline repository stays byte-identical; the script verifies that at the end.
#
# Usage:  ./scripts/setup-prototype-review.sh [path-to-kkl-design] [out-dir]
set -euo pipefail

DESIGN="${1:-../kkl-design}"
OUT="${2:-/tmp/kkl-prototype-review}"

REACT_VERSION=18.3.1
BABEL_VERSION=7.29.0

if [ ! -d "$DESIGN" ]; then
  echo "No design directory at $DESIGN" >&2
  exit 2
fi

echo "Building a review copy of $DESIGN into $OUT"
rm -rf "$OUT"
mkdir -p "$OUT/vendor"

fetch() {  # fetch <package> <version> <dest-dir-name>
  local pkg="$1" version="$2" dest="$3"
  local encoded="${pkg//\//%2F}"
  local url
  url="$(curl -fsS "https://registry.npmjs.org/${encoded}/${version}" \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['dist']['tarball'])")"
  echo "  $pkg@$version"
  curl -fsS "$url" -o "$OUT/vendor/$dest.tgz"
  ( cd "$OUT/vendor" && tar xzf "$dest.tgz" && mv package "$dest" && rm "$dest.tgz" )
}

echo "Fetching the versions the prototypes pin:"
fetch react "$REACT_VERSION" react-pkg
fetch react-dom "$REACT_VERSION" react-dom-pkg
fetch @babel/standalone "$BABEL_VERSION" babel-pkg

echo "Fetching fonts (@fontsource ships the same upstream files as Google Fonts):"
for family in archivo public-sans ibm-plex-mono; do
  fetch "@fontsource/$family" latest "font-$family"
done

# One stylesheet standing in for the Google Fonts request.
{
  echo "/* Local stand-in for the Google Fonts stylesheet the prototypes request."
  echo "   Same families and weights, from @fontsource. */"
} > "$OUT/fonts.css"
for family in archivo public-sans ibm-plex-mono; do
  for weight in 400 500 600 700 800; do
    file="$OUT/vendor/font-$family/$weight.css"
    [ -f "$file" ] && sed "s|url(\./files/|url(./vendor/font-$family/files/|g" "$file" >> "$OUT/fonts.css"
  done
done

# The runtime, with its CDN URLs pointed at the local copies.
for helper in support.js kkl-shared-state.js image-slot.js; do
  [ -f "$DESIGN/$helper" ] && cp "$DESIGN/$helper" "$OUT/"
done
sed -i \
  -e "s|https://unpkg.com/react@${REACT_VERSION}/umd/react.production.min.js|./vendor/react-pkg/umd/react.production.min.js|g" \
  -e "s|https://unpkg.com/react-dom@${REACT_VERSION}/umd/react-dom.production.min.js|./vendor/react-dom-pkg/umd/react-dom.production.min.js|g" \
  -e "s|https://unpkg.com/@babel/standalone@${BABEL_VERSION}/babel.min.js|./vendor/babel-pkg/babel.min.js|g" \
  "$OUT/support.js"

# Stand-in photography, so the normal (image present) state can be compared.
# These are NOT the baseline photographs — images.unsplash.com is unreachable
# from environments with this kind of egress policy. Both sides get the same
# bytes, so what the comparison shows is slot layout and crop, not photography.
if [ "${KKL_REVIEW_PHOTOS:-on}" = "off" ]; then
  # The missing-media state needs BOTH sides missing media. Building a second
  # copy this way is how that state stays a real comparison rather than a
  # prototype with photographs set against an application without them.
  echo "  KKL_REVIEW_PHOTOS=off - leaving the photograph URLs as the baseline has them"
  PHOTOS_READY=0
elif node -e "require.resolve('sharp')" >/dev/null 2>&1; then
  node "$(dirname "$0")/make-review-photos.mjs" "$OUT/vendor/photos"
  PHOTOS_READY=1
else
  echo "  sharp not resolvable - skipping stand-in photography" >&2
  PHOTOS_READY=0
fi

# The prototypes themselves.
python3 - "$DESIGN" "$OUT" "$PHOTOS_READY" <<'PY'
import pathlib, re, sys
design, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
photos_ready = sys.argv[3] == '1'
for f in sorted(design.glob('*.dc.html')):
    if 'archived' in f.name:
        continue
    s = f.read_text()
    s = re.sub(r'https://unpkg\.com/react@[\d.]+/umd/react\.(production\.min|development)\.js',
               lambda m: f'./vendor/react-pkg/umd/react.{m.group(1)}.js', s)
    s = re.sub(r'https://unpkg\.com/react-dom@[\d.]+/umd/react-dom\.(production\.min|development)\.js',
               lambda m: f'./vendor/react-dom-pkg/umd/react-dom.{m.group(1)}.js', s)
    s = re.sub(r'https://unpkg\.com/@babel/standalone@[\d.]+/babel\.min\.js',
               './vendor/babel-pkg/babel.min.js', s)
    s = re.sub(r'<link href="https://fonts\.googleapis\.com/css2[^"]*" rel="stylesheet">',
               '<link href="./fonts.css" rel="stylesheet">', s)
    s = re.sub(r'<link rel="preconnect" href="https://fonts\.(googleapis|gstatic)\.com"[^>]*>', '', s)
    if photos_ready:
        # The query is dropped and .jpg appended so a plain static file server
        # answers with image/jpeg rather than octet-stream. Unsplash's sizing
        # parameters have no meaning locally, and the slots crop with CSS.
        #
        # Two forms appear in the baseline. The second one — a URL assembled
        # by string concatenation — is why the assertion below exists: the
        # first pass only handled whole URLs, and P-03's main gallery image
        # went on rendering as a broken slot in a run that otherwise looked
        # like a successful comparison.
        s = re.sub(r'https://images\.unsplash\.com/(photo-[\w-]+)[^"\'\s<>]*',
                   r'./vendor/photos/\1.jpg', s)
        s = re.sub(
            r"""'https://images\.unsplash\.com/(photo-)'(\s*\+\s*[^+]+?\s*\+\s*)'\?[^']*'""",
            r"'./vendor/photos/\1'\2'.jpg'", s)
    (out / f.name).write_text(s)
    print(f'  {f.name}')
PY

pattern="unpkg.com\|fonts.googleapis"
# A photograph left pointing at a blocked host renders as a broken slot, and a
# broken slot in a "successful" capture is worse than no capture at all.
[ "$PHOTOS_READY" = "1" ] && pattern="$pattern\|images.unsplash.com"
remaining=$(grep -l "$pattern" "$OUT"/*.dc.html "$OUT"/support.js 2>/dev/null || true)
if [ -n "$remaining" ]; then
  echo "Still referencing a blocked host: $remaining" >&2
  exit 1
fi

# The baseline must be untouched. This is the whole point of a copy.
if [ -d "$DESIGN/.git" ] && [ -n "$(git -C "$DESIGN" status --porcelain)" ]; then
  echo "kkl-design was modified — it must not be. Aborting." >&2
  git -C "$DESIGN" status --porcelain >&2
  exit 1
fi

echo
echo "Ready. kkl-design is unmodified."
echo "Serve it:   (cd $OUT && python3 -m http.server 8099)"
echo "Then:       PROTO_URL=http://127.0.0.1:8099 BASE_URL=http://127.0.0.1:3811 \\"
echo "            PLAYWRIGHT=... node scripts/capture-visual-comparison.mjs"
