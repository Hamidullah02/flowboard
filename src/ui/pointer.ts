/*
 * Pointer coordinate conversion.
 *
 * This is the one place where browser coordinates become SVG user units.
 * It lives in `src/ui/` rather than `src/core/` because it touches the DOM,
 * and `src/core/` is required to stay DOM-free.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Convert a pointer event's client coordinates into SVG user units.
 *
 * `clientX`/`clientY` are pixels relative to the browser viewport. SVG user
 * units are relative to the SVG's own coordinate system, which the browser
 * scales and offsets. The only correct way to bridge the two is the SVG's
 * screen CTM (current transformation matrix).
 *
 * Never use `clientX` directly as an SVG coordinate.
 */
export function clientToSvg(
  event: { clientX: number; clientY: number },
  svg: SVGSVGElement,
): Point {
  // `getScreenCTM` is absent in jsdom and can be absent on a detached element.
  if (typeof svg.getScreenCTM !== 'function') {
    return { x: event.clientX, y: event.clientY };
  }

  const ctm = svg.getScreenCTM();
  if (!ctm) {
    // The element is not rendered (detached, or display:none). Fall back to
    // the raw client coordinates rather than throwing: a detached canvas is a
    // legitimate state during teardown.
    return { x: event.clientX, y: event.clientY };
  }

  const inverse = ctm.inverse();
  return {
    x: inverse.a * event.clientX + inverse.c * event.clientY + inverse.e,
    y: inverse.b * event.clientX + inverse.d * event.clientY + inverse.f,
  };
}

/**
 * Convert SVG user units back into client (viewport) coordinates.
 *
 * Needed when a preview element is rendered in HTML space, or when a pointer
 * position must be compared against a DOM element's bounding box.
 */
export function svgToClient(point: Point, svg: SVGSVGElement): Point {
  if (typeof svg.getScreenCTM !== 'function') {
    return { x: point.x, y: point.y };
  }

  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return { x: point.x, y: point.y };
  }

  return {
    x: ctm.a * point.x + ctm.c * point.y + ctm.e,
    y: ctm.b * point.x + ctm.d * point.y + ctm.f,
  };
}
