import { describe, expect, it } from 'vitest';
import { shouldHandleCameraKey } from './cameraKeyboard';

describe('camera keyboard routing', () => {
  it('handles navigation keys from the map surface', () => {
    expect(shouldHandleCameraKey('ArrowLeft', document.createElement('section'))).toBe(true);
    expect(shouldHandleCameraKey('w', document.body)).toBe(true);
    expect(shouldHandleCameraKey('W', document.body)).toBe(true);
  });

  it('does not intercept keys from interactive controls', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    for (const element of [
      document.createElement('button'),
      document.createElement('a'),
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('select'),
      editable,
    ]) {
      expect(shouldHandleCameraKey('ArrowDown', element)).toBe(false);
    }
  });

  it('ignores unrelated keys', () => {
    expect(shouldHandleCameraKey('Tab', document.body)).toBe(false);
  });
});
