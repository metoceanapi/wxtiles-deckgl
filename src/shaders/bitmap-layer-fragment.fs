// #version 300 es
/**
 * Pack the top 12 bits of two normalized floats into 3 8-bit (rgb) values
 * This enables addressing 4096x4096 individual pixels
 *
 * returns vec3 encoded RGB colors
 *  result.r - top 8 bits of u
 *  result.g - top 8 bits of v
 *  result.b - next 4 bits of u and v: (u + v * 16)
 */

 #define SHADER_NAME bitmap-layer-fragment-shader

precision highp float;

uniform sampler2D bitmapTexture;

varying vec2 vTexCoord;
varying vec2 vTexPos;

uniform float desaturate;
uniform vec4 transparentColor;
uniform vec3 tintColor;
uniform float opacity;

uniform float coordinateConversion;
uniform vec4 bounds;

 /* projection utils */
const float TILE_SIZE = 256.0;
const float PI = 3.1415926536;
const float WORLD_SCALE = TILE_SIZE / PI / 2.0;

 // from degrees to Web Mercator
vec2 lnglat_to_mercator(vec2 lnglat) {
  float x = lnglat.x;
  float y = clamp(lnglat.y, -89.9, 89.9);
  return vec2(radians(x) + PI, PI + log(tan(PI * 0.25 + radians(y) * 0.5))) * WORLD_SCALE;
}

 // from Web Mercator to degrees
vec2 mercator_to_lnglat(vec2 xy) {
  xy /= WORLD_SCALE;
  return degrees(vec2(xy.x - PI, atan(exp(xy.y - PI)) * 2.0 - PI * 0.5));
}
 /* End projection utils */

 // apply desaturation
vec3 color_desaturate(vec3 color) {
  float luminance = (color.r + color.g + color.b) * 0.333333333;
  return mix(color, vec3(luminance), desaturate);
}

 // apply tint
vec3 color_tint(vec3 color) {
  return color * tintColor;
}

 // blend with background color
vec4 apply_opacity(vec3 color, float alpha) {
  return mix(transparentColor, vec4(color, 1.0), alpha);
}

vec2 getUV(vec2 pos) {
  return vec2((pos.x - bounds[0]) / (bounds[2] - bounds[0]), (pos.y - bounds[3]) / (bounds[1] - bounds[3]));
}

vec3 packUVsIntoRGB(vec2 uv) {
  // Extract the top 8 bits. We want values to be truncated down so we can add a fraction
  vec2 uv8bit = floor(uv * 256.);

  // Calculate the normalized remainders of u and v parts that do not fit into 8 bits
  // Scale and clamp to 0-1 range
  vec2 uvFraction = fract(uv * 256.);
  vec2 uvFraction4bit = floor(uvFraction * 16.);

  // Remainder can be encoded in blue channel, encode as 4 bits for pixel coordinates
  float fractions = uvFraction4bit.x + uvFraction4bit.y * 16.;

  return vec3(uv8bit, fractions) / 255.;
}

const float tileSzExInv = 1.0 / 258.0;
const float tileM = 256.0 / 258.0;
const vec2 one = vec2(tileSzExInv, tileSzExInv);

uniform sampler2D clutTextureUniform;
uniform float shift; // the wize of isoline
uniform int isoline;
uniform vec3 isolineColor;
uniform bool fill;

float GetPackedData(vec2 texCoord) {
  vec4 tex = texture2D(bitmapTexture, texCoord);
  return (tex.r * 255.0 + tex.g * 255.0 * 256.0) / 65535.0;
}

vec4 CLUT(float pos) {
  // upper pixel is a CLUT component
  return texture2D(clutTextureUniform, vec2(pos, 0.0));
}

int isolineIndex(float pos) {
  // bottom pixel is an Isoline index, so if central index != neighbore index then the pixel is on isoline
  float bottomPixel = texture2D(clutTextureUniform, vec2(pos, 1.0)).r;
  return int(bottomPixel * 255.0);
}

void main(void) {

  vec2 uv = vTexCoord;
  if(coordinateConversion < -0.5) {
    vec2 lnglat = mercator_to_lnglat(vTexPos);
    uv = getUV(lnglat);
  } else if(coordinateConversion > 0.5) {
    vec2 commonPos = lnglat_to_mercator(vTexPos);
    uv = getUV(commonPos);
  }

  uv = uv * tileM + one; // 256 -> 258 shifted

  if(picking_uActive) {
    gl_FragColor = texture2D(bitmapTexture, uv);
    return;
  }

  vec2 uvC = uv; // central pixel

  // check for NODATA
  vec2 ucCfloor = floor(uvC * 258.0) / 258.0;
  vec4 dataCheck1 = texture2D(bitmapTexture, ucCfloor);
  vec4 dataCheck2 = texture2D(bitmapTexture, ucCfloor + vec2(1.0, 1.0) / 258.0);
  if((dataCheck1.r == 0.0 && dataCheck1.g == 0.0) || (dataCheck2.r == 0.0 && dataCheck2.g == 0.0))
    discard;

  // calc Right pixel coord 
  vec2 uvR = uvC + vec2(shift, 0.0);
  // calc Bottom pixel coord 
  vec2 uvB = uvC + vec2(0.0, shift);

  vec4 bitmapColor = vec4(0.0); // result Color

  float packedC = GetPackedData(uvC); // central data
  vec4 colorC = CLUT(packedC);
  if(fill) {
    bitmapColor = colorC;
  }

  // return;
  if(isoline != 0) {
    int isoC = isolineIndex(packedC);

    float packedR = GetPackedData(uvR); // central
    int isoR = isolineIndex(packedR);

    float packedD = GetPackedData(uvB); // central
    int isoD = isolineIndex(packedD);

    if(isoC != isoD || isoC != isoR) {
      bitmapColor = vec4(isolineColor, 1.0); // isoline != 1 or 2

      if(isoline == 1)
        bitmapColor = vec4(1.0 - colorC.r, 1.0 - colorC.g, 1.0 - colorC.b, colorC.a);
      if(isoline == 2)
        bitmapColor = vec4(colorC.r, colorC.g, colorC.b, colorC.a);
    }
  }

  gl_FragColor = apply_opacity(color_tint(color_desaturate(bitmapColor.rgb)), bitmapColor.a * opacity);

  geometry.uv = uvC;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
