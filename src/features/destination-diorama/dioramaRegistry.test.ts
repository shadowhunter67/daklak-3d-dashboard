import { describe, expect, it } from 'vitest';
import { verifiedTourismDestinations } from '../../entities/tourism/verifiedTourismDestinations';
import { DIORAMA_BASIS, DIORAMA_DESTINATION_IDS } from './dioramaConfig';
import { DIORAMA_SCENES } from './dioramaRegistry';

describe('diorama registry', () => {
  const destinationIds = verifiedTourismDestinations.map((d) => d.id).sort();

  it('has a scene for every sourced destination, and no scene for an unknown one', () => {
    expect(Object.keys(DIORAMA_SCENES).sort()).toEqual(destinationIds);
  });

  it('declares the basis (photo or text) for exactly the same destinations', () => {
    expect([...DIORAMA_DESTINATION_IDS].sort()).toEqual(destinationIds);
    expect(Object.keys(DIORAMA_BASIS).sort()).toEqual(destinationIds);
  });

  it('only claims a photo basis when a verified free photo is linked in the data', () => {
    for (const destination of verifiedTourismDestinations) {
      if (DIORAMA_BASIS[destination.id] === 'photo') {
        expect(destination.imageUrl, destination.id).toBeTruthy();
        expect(destination.imageLicense, destination.id).toBeTruthy();
      }
    }
  });

  it('every destination with a linked photo is built from it (basis photo)', () => {
    for (const destination of verifiedTourismDestinations) {
      if (destination.imageUrl) {
        expect(DIORAMA_BASIS[destination.id], destination.id).toBe('photo');
      }
    }
  });
});
