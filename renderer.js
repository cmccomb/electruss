const editable_color = 'grey';
const edge_color = 'lightgrey';

const min_edge_width = 5;
const max_edge_width = 25;

const x_fixed_image = './assets/images/xfixed.png';
const y_fixed_image = './assets/images/yfixed.png';
const xy_fixed_image = './assets/images/xyfixed.png';

const scale_factor = 10;

const default_elastic_modulus = 10 ** 9;
const default_area = 1.0;

const $ =
  (typeof window !== 'undefined' && (window.$ || window.jQuery)) ||
  require('jquery');
if (typeof window !== 'undefined' && !window.$) {
  window.$ = $;
}

const vis = (typeof window !== 'undefined' && window.vis) || global.vis;

if (!vis) {
  throw new Error('vis library is required for renderer initialization.');
}

// create an array with nodes
let nodes = new vis.DataSet([
  {
    x: -100,
    y: 0,
    fixed: true,
    physics: false,
    shape: 'image',
    image: xy_fixed_image,
    size: 25,
  },
  {
    x: 100,
    y: 0,
    fixed: true,
    physics: false,
    shape: 'image',
    image: xy_fixed_image,
    size: 25,
  },
]);

// create an array with edges
let edges = new vis.DataSet([]);

function update_edges() {
  // Get all widths
  let ids = edges.getIds();
  if (ids.length === 0) {
    return;
  }
  let areas = [];
  for (let i = 0; i < ids.length; i++) {
    areas.push(edges.get(ids[i]).area);
  }

  let minarea = Math.min(...areas);
  let darea = Math.max(...areas) - minarea;

  if (darea !== 0) {
    for (let i = 0; i < ids.length; i++) {
      let edge = edges.get(ids[i]);
      let scaled_width = (areas[i] - minarea) / darea;
      edge.width =
        scaled_width * (max_edge_width - min_edge_width) + min_edge_width;
      edges.update(edge);
    }
  }
}

// Identify teh container for hte network drawing
let container = document.getElementById('network');

// Define data
let data = {
  nodes: nodes,
  edges: edges,
};

// Define a hell of a lot of options
let options = {
  autoResize: true,
  height: '100%',
  width: '100%',
  locale: 'en',
  interaction: {
    dragNodes: false,
    selectConnectedEdges: false,
  },
  manipulation: {
    enabled: false,
    addNode: function (nodeData, callback) {
      nodeData.label = undefined;
      nodeData.physics = false;
      nodeData.color = editable_color;
      callback(nodeData);
      network.addNodeMode();
    },
    editNode: function (nodeData, callback) {
      console.log(nodeData);
      $('#nodeModalLabel').val(nodeData.id);
      $('#node-x-fixed').prop('checked', nodeData.fixed.x);
      $('#node-y-fixed').prop('checked', nodeData.fixed.y);
      $('#node-x-coord').val(nodeData.x);
      $('#node-y-coord').val(nodeData.y);
      $('#nodeModal').modal('show');
      callback(nodeData);
    },
    addEdge: function (edgeData, callback) {
      if (edgeData.to !== edgeData.from) {
        edgeData.smooth = false;
        edgeData.color = edge_color;
        edgeData.width = 5;
        edgeData.area = default_area;
        edgeData.elastic_modulus = default_elastic_modulus;
        callback(edgeData);
      }
      update_edges();
      network.addEdgeMode();
    },
    editEdge: {
      editWithoutDrag: function (edgeData, callback) {
        edgeData = edges.get(edgeData.id);
        $('#edgeModalLabel').val(edgeData.id);
        $('#edgeModal').modal('show');
        $('#edge-area').val(edgeData.area);
        $('#edge-elastic-modulus').val(edgeData.elastic_modulus);
        callback(edgeData);
      },
    },
    deleteNode: true,
    deleteEdge: true,
  },
};

// Construct initial network
let network = new vis.Network(container, data, options);

// Add node callback
$('#add-node').on('click', function () {
  deactivate('#add-edge');
  deactivate('#drag-node');
  $('#add-node').toggleClass('active');
  if ($('#add-node').hasClass('active') === true) {
    network.addNodeMode();
  } else {
    network.disableEditMode();
  }
});

// Edit node cal
$('#edit-node').on('click', function () {
  deactivate_all();
  network.editNode();
});

// Drag node callback
$('#drag-node').on('click', function () {
  deactivate('#add-edge');
  deactivate('#add-node');
  $('#drag-node').toggleClass('active');
  if ($('#drag-node').hasClass('active') === true) {
    options.interaction.dragNodes = true;
    network.setOptions(options);
  } else {
    options.interaction.dragNodes = false;
    network.setOptions(options);
  }
});

// Add Edge callback
$('#add-edge').on('click', function () {
  deactivate('#add-node');
  deactivate('#drag-node');
  $('#add-edge').toggleClass('active');
  if ($('#add-edge').hasClass('active') === true) {
    network.addEdgeMode();
  } else {
    network.disableEditMode();
  }
});

// Edit Edge Callback
$('#edit-edge').on('click', function () {
  deactivate_all();
  network.editEdgeMode();
  update_edges();
});

// Delete selected callback
$('#delete').on('click', function () {
  deactivate_all();
  network.deleteSelected();
  update_edges();
});

// Zoom to fit callback
$('#zoom-to-fit').on('click', function () {
  deactivate_all();
  network.disableEditMode();
  network.fit({ animation: true });
});

// Modal node apply callback
$('#node-modal-apply').on('click', function () {
  let node = nodes.get($('#nodeModalLabel').val());
  node.fixed.x = $('#node-x-fixed').prop('checked');
  node.fixed.y = $('#node-y-fixed').prop('checked');
  node.x = parseFloat($('#node-x-coord').val());
  node.y = parseFloat($('#node-y-coord').val());
  if (node.fixed.x === true && node.fixed.y === false) {
    node.shape = 'image';
    node.image = x_fixed_image;
    node.size = 12.5;
  } else if (node.fixed.x === false && node.fixed.y === true) {
    node.shape = 'image';
    node.image = y_fixed_image;
    node.size = 12.5;
  } else if (node.fixed.x === true && node.fixed.y === true) {
    node.shape = 'image';
    node.image = xy_fixed_image;
    node.size = 25;
  } else if (node.fixed.x === false && node.fixed.y === false) {
    node.shape = 'ellipse';
    node.size = 25;
    node.color = editable_color;
  }
  nodes.update(node);
  $('#nodeModal').modal('hide');
});

// Modal edge apply callback
$('#edge-modal-apply').on('click', function () {
  let edge = edges.get($('#edgeModalLabel').val());
  edge.area = parseFloat($('#edge-area').val());
  edge.elastic_modulus = parseFloat($('#edge-elastic-modulus').val());
  edges.update(edge);
  $('#edgeModal').modal('hide');
  update_edges();
});

// Modal login callback
$('#login-modal-apply').on('click', function () {
  $('#loginModal').modal('hide');
  $('#all').removeClass('d-none');
  network.fit();
});

// Deactive a single button
function deactivate(name) {
  $(name).removeClass('active');
}

// Deactive all buttons
function deactivate_all() {
  deactivate('#add-node');
  deactivate('#add-edge');
  deactivate('#drag-node');
}

// Convert canvas to simulation units
function canv2sim(node) {
  return [node.x[0] / scale_factor, -node.y[1] / scale_factor];
}

// Convert simulation units to canvas units
function sim2canv(node) {
  return [node.x[0] * scale_factor, -node.y[1] * scale_factor];
}

// Save network to json string
function save_to_JSON(nodes, edges) {
  let network = { time: new Date(), nodes: [], edges: [] };
  let node_ids = nodes.getIds();
  for (let i = 0; i < node_ids.length; i++) {
    network.nodes.push(nodes.get(node_ids[i]));
  }

  let edge_ids = edges.getIds();
  for (let i = 0; i < edge_ids.length; i++) {
    network.edges.push(edges.get(edge_ids[i]));
  }

  return JSON.stringify(network);
}

const rendererApi = {
  update_edges,
  deactivate,
  deactivate_all,
  save_to_JSON,
  canv2sim,
  sim2canv,
  getNetwork: () => network,
  getNodes: () => nodes,
  getEdges: () => edges,
};

if (typeof window !== 'undefined') {
  window.electruss = rendererApi;
}

if (typeof module !== 'undefined') {
  module.exports = rendererApi;
}
