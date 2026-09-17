"""The badge system, as data.

Everything the renderer needs to know about how a badge looks lives here:
the two spectra, the six treatments that fall out of the verb/preposition
grid, the light and dark grounds, and the tools that can appear in the logo
slot. Geometry is expressed at the default size (12px type) and scaled
wholesale by the renderer, so a number in this file is a number you can read
off the original design.

Source: the "AI Attribution Badges" canvas, board B3 -- Soft pill, site
palette. The cool spectrum is anchored on #3379BE, which is the link colour
bennorris.com already uses.
"""

# --- The two spectra -------------------------------------------------------
#
# One warm-to-cool sweep, re-anchored on the site's own blue. BRIGHT carries
# outlines and rings; DEEP is the same four hues dropped below 0.18 luminance
# so white type on a filled badge clears 4.5:1.

BRIGHT = ["#0F8A93", "#3379BE", "#6A6FC4", "#A25FA8"]
DEEP = ["#0A6A71", "#275B8E", "#4E52A0", "#7C4682"]


# --- Grounds ---------------------------------------------------------------
#
# The obvious move on a dark page is to flip a filled badge to the bright
# spectrum with dark type, since the deep spectrum is close to the ground. It
# does not survive a contrast check: the bright hues sit in the middle
# luminance band, where ink text measures 3.7-4.2:1 against them and white text
# is no better -- 4.0:1 on the teal and indigo stops. Nothing clears 4.5:1
# across the whole sweep.
#
# So both grounds keep the deep spectrum under white type, which clears 6.3:1
# at every stop. What a dark page actually needs is an edge, not a different
# fill, and `edge` draws a bright hairline just inside any pill that has no
# ring of its own. It sits inside the shape, so the light and dark treatments
# stay exactly the same size -- which they have to, since one file carries both.

THEMES = {
    "light": {
        "ground": "#FFFFFF",
        "ink": "#181C22",
        "muted": "#4A4E55",
        "filled_stops": DEEP,
        "filled_text": "#FFFFFF",
        "edge": False,
    },
    "dark": {
        "ground": "#181C22",
        "ink": "#FFFFFF",
        "muted": "#A9ADB4",
        "filled_stops": DEEP,
        "filled_text": "#FFFFFF",
        "edge": True,
    },
}


# --- The grid --------------------------------------------------------------
#
# Two axes. The preposition says who led: `with` keeps the colour on the edge,
# `by` floods the badge. The verb says how much of the thing the tool brought
# into being: edited is quiet, created is loud.
#
# pad is (top, right, bottom, left) inside the ring, in design px.
# fill is "ground", "deep", or ("tint", alpha) for a spectrum wash over ground.
# text is "ink", "muted", or "filled".

VERBS = ["edited", "written", "created"]
PREPOSITIONS = ["with", "by"]

TREATMENTS = {
    ("edited", "with"): {
        "ring": 1.0,
        "ring_alpha": 0.55,
        "pad": (3, 13, 3, 3),
        "fill": "ground",
        "text": "muted",
        "weight": "quiet",
    },
    ("edited", "by"): {
        "ring": 0.0,
        "ring_alpha": 0.0,
        "pad": (4, 14, 4, 4),
        "fill": ("tint", 0.26),
        "text": "ink",
        "weight": "quiet",
    },
    ("written", "with"): {
        "ring": 2.0,
        "ring_alpha": 1.0,
        "pad": (3, 13, 3, 3),
        "fill": "ground",
        "text": "ink",
        "weight": "mid",
    },
    ("written", "by"): {
        "ring": 0.0,
        "ring_alpha": 0.0,
        "pad": (4, 15, 4, 4),
        "fill": "deep",
        "text": "filled",
        "weight": "mid",
    },
    ("created", "with"): {
        "ring": 2.0,
        "ring_alpha": 1.0,
        "pad": (4, 14, 4, 4),
        "fill": ("tint", 0.16),
        "text": "ink",
        "weight": "loud",
    },
    ("created", "by"): {
        "ring": 2.0,
        "ring_alpha": 1.0,
        "pad": (4, 15, 4, 4),
        "fill": "deep",
        "text": "filled",
        "weight": "loud",
    },
}


# --- Fixed geometry, at the default size -----------------------------------

FONT_SIZE = 12.0   # design px; every other size is a multiple of this
PLATE = 22.0       # the round logo plate
GAP = 8.0          # plate to type

SIZES = {
    "sm": 10.0 / FONT_SIZE,
    "md": 1.0,
    "lg": 15.0 / FONT_SIZE,
}
DEFAULT_SIZE = "md"


# --- Typeface --------------------------------------------------------------
#
# The badge wears the site's own face. The original board specified IBM Plex
# Sans, but only because an SVG used as an <img> -- in a README, in a Markdown
# post, anywhere outside a page's own DOM -- cannot fetch a webfont, so the
# design could not reach for a face the badge would have no way to load.
# Converting type to outlines removes that constraint entirely: the font is
# needed here, when the file is written, and never again.
#
# So it is Duo, which is what $base-font-family in _variables.scss actually
# puts first, with Quattro -- its own fallback -- available as the alternative.
# Both are already served from assets/fonts, so the badges cost no new bytes
# and no third-party face appears on a page that does not otherwise have one.
#
# Each weight name is a rung on the loudness ramp: quiet for `edited`, mid for
# `written`, loud for `created`. Both faces ship Regular and Bold only, so mid
# and loud share a weight and the ring and fill treatments carry that step --
# `written with` is a white pill, `created with` a tinted one.
#
# Paths are relative to the repository root. fontTools reads woff directly, so
# these are the same files the stylesheet serves rather than copies.

FONTS = {
    "duo": {
        "quiet": "assets/fonts/iAWriterDuoS-Regular.woff",
        "mid": "assets/fonts/iAWriterDuoS-Bold.woff",
        "loud": "assets/fonts/iAWriterDuoS-Bold.woff",
    },
    "quattro": {
        "quiet": "assets/fonts/iAWriterQuattroS-Regular.woff",
        "mid": "assets/fonts/iAWriterQuattroS-Bold.woff",
        "loud": "assets/fonts/iAWriterQuattroS-Bold.woff",
    },
}
DEFAULT_FONT = "duo"


# --- Tools -----------------------------------------------------------------
#
# Each tool contributes a name and a mark. The spectrum belongs to the system,
# not the vendor, so the plate is the only place a brand colour appears.
#
# `bleed` scales the mark relative to the plate: 1.0 sits the mark inside the
# plate, above 1.0 crops it to the plate's edge. The OpenAI blossom carries
# enough internal air that it wants the bleed.

TOOLS = {
    "claude": {
        "label": "Claude",
        "logo": "claude.svg",
        "plate": {"light": "#D97757", "dark": "#D97757"},
        "mark": {"light": "#FAF9F5", "dark": "#FAF9F5"},
        "bleed": 13.0 / 22.0,
    },
    "chatgpt": {
        "label": "ChatGPT",
        "logo": "openai.svg",
        "plate": {"light": "#181C22", "dark": "#FFFFFF"},
        "mark": {"light": "#FFFFFF", "dark": "#181C22"},
        "bleed": 26.0 / 22.0,
    },
}
