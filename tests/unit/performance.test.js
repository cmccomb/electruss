const { computeTrussPerformance } = require('../../performance');

function createSimpleTruss(loadFx = 1000) {
  const nodes = [
    {
      id: 'a',
      x: 0,
      y: 0,
      fixed: { x: true, y: true },
      load: { fx: 0, fy: 0 },
    },
    {
      id: 'b',
      x: 1,
      y: 0,
      fixed: { x: false, y: true },
      load: { fx: loadFx, fy: 0 },
    },
  ];
  const edges = [
    { id: 'm1', from: 'a', to: 'b', area: 0.01, elastic_modulus: 200e9 },
  ];
  return { nodes, edges };
}

describe('computeTrussPerformance', () => {
  it('solves axial response for a single-member truss', () => {
    const { nodes, edges } = createSimpleTruss();

    const result = computeTrussPerformance(nodes, edges);

    const displacementB = result.displacements.get('b');
    expect(displacementB.dx).toBeCloseTo(5e-7, 10);
    expect(displacementB.dy).toBeCloseTo(0, 10);

    const memberForce = result.memberForces.find(
      (member) => member.id === 'm1'
    );
    expect(memberForce.axialForce).toBeCloseTo(1000, 6);

    const reactionA = result.reactions.get('a');
    expect(reactionA.rx).toBeCloseTo(-1000, 6);
    expect(reactionA.ry).toBeCloseTo(0, 6);

    expect(result.maxDisplacement).toBeCloseTo(5e-7, 10);
  });

  it('throws when the stiffness matrix is singular', () => {
    const nodes = [
      { id: 1, x: 0, y: 0, fixed: { x: false, y: false } },
      {
        id: 2,
        x: 1,
        y: 0,
        fixed: { x: false, y: false },
        load: { fx: 10, fy: 0 },
      },
    ];
    const edges = [
      { id: 'e', from: 1, to: 2, area: 0.01, elastic_modulus: 1e7 },
    ];

    expect(() => computeTrussPerformance(nodes, edges)).toThrow(
      /structure is unstable/i
    );
  });

  it('guards against zero-length members', () => {
    const nodes = [
      { id: 1, x: 0, y: 0, fixed: { x: true, y: true } },
      {
        id: 2,
        x: 0,
        y: 0,
        fixed: { x: false, y: true },
        load: { fx: 5, fy: 0 },
      },
    ];
    const edges = [
      { id: 'e', from: 1, to: 2, area: 0.01, elastic_modulus: 1e7 },
    ];

    expect(() => computeTrussPerformance(nodes, edges)).toThrow(
      /greater than zero/i
    );
  });
});
