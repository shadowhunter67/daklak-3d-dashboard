import { afterEach, describe, expect, it } from 'vitest';
import {
  __resetTouchInputBridgeForTests,
  consumeTouchInteractRequest,
  consumeTouchLookDelta,
  getTouchMovementAsDirections,
  isTouchAscendHeld,
  pushTouchLookDelta,
  requestTouchInteract,
  setTouchAscendHeld,
  setTouchMovementVector,
  resetTouchMovementVector,
} from './touchInputBridge';

afterEach(() => {
  __resetTouchInputBridgeForTests();
});

describe('getTouchMovementAsDirections', () => {
  it('all false at rest (0,0)', () => {
    setTouchMovementVector({ x: 0, z: 0, run: false });
    expect(getTouchMovementAsDirections()).toEqual({
      forward: false,
      backward: false,
      left: false,
      right: false,
      run: false,
    });
  });

  it('small deflection inside the dead zone stays false (no jitter on light touch)', () => {
    setTouchMovementVector({ x: 0.1, z: -0.1, run: false });
    expect(getTouchMovementAsDirections()).toEqual({
      forward: false,
      backward: false,
      left: false,
      right: false,
      run: false,
    });
  });

  it('negative z is forward (matches MovementInput.forward -> z=-1 convention)', () => {
    setTouchMovementVector({ x: 0, z: -0.5, run: false });
    expect(getTouchMovementAsDirections().forward).toBe(true);
    expect(getTouchMovementAsDirections().backward).toBe(false);
  });

  it('positive x is right, negative x is left', () => {
    setTouchMovementVector({ x: 0.5, z: 0, run: false });
    expect(getTouchMovementAsDirections().right).toBe(true);
    setTouchMovementVector({ x: -0.5, z: 0, run: false });
    expect(getTouchMovementAsDirections().left).toBe(true);
  });

  it('diagonal deflection sets both axes', () => {
    setTouchMovementVector({ x: 0.5, z: -0.5, run: false });
    const directions = getTouchMovementAsDirections();
    expect(directions.forward).toBe(true);
    expect(directions.right).toBe(true);
  });

  it('run passes through unchanged', () => {
    setTouchMovementVector({ x: 0, z: -0.5, run: true });
    expect(getTouchMovementAsDirections().run).toBe(true);
  });

  it('resetTouchMovementVector returns to rest', () => {
    setTouchMovementVector({ x: 1, z: 1, run: true });
    resetTouchMovementVector();
    expect(getTouchMovementAsDirections()).toEqual({
      forward: false,
      backward: false,
      left: false,
      right: false,
      run: false,
    });
  });
});

describe('touch look delta', () => {
  it('accumulates multiple pushes and drains exactly once', () => {
    pushTouchLookDelta(10, -5);
    pushTouchLookDelta(2, 3);
    expect(consumeTouchLookDelta()).toEqual({ dx: 12, dy: -2 });
    expect(consumeTouchLookDelta()).toEqual({ dx: 0, dy: 0 });
  });
});

describe('touch ascend hold', () => {
  it('defaults to not held', () => {
    expect(isTouchAscendHeld()).toBe(false);
  });

  it('reflects the last set value', () => {
    setTouchAscendHeld(true);
    expect(isTouchAscendHeld()).toBe(true);
    setTouchAscendHeld(false);
    expect(isTouchAscendHeld()).toBe(false);
  });
});

describe('touch interact request', () => {
  it('is a one-shot flag: true exactly once after a request, then false', () => {
    expect(consumeTouchInteractRequest()).toBe(false);
    requestTouchInteract();
    expect(consumeTouchInteractRequest()).toBe(true);
    expect(consumeTouchInteractRequest()).toBe(false);
  });
});
