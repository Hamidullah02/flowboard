/*
 * Keyboard helpers.
 *
 * Shared by the canvas and the app shell, because both listen for keys on
 * `window` and both must ignore keys aimed at a text field.
 */

/**
 * Whether a keyboard event is aimed at something the user is typing into.
 *
 * A shortcut must not fire while a label is being edited: pressing Delete
 * inside the label editor should delete a character, not the node.
 *
 * The check is against `HTMLElement` rather than `Element`, because SVG
 * elements are focusable but are never text inputs.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/**
 * Whether a keyboard event carries the platform's modifier (Ctrl on Windows
 * and Linux, Cmd on macOS).
 */
export function hasModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey;
}
