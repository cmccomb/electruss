const editable_color = "grey";
const fixed_color = "black";
const edge_color = "lightgrey";

const min_edge_width = 5;
const max_edge_width = 25;

const x_fixed_image = "./assets/images/xfixed.png";
const y_fixed_image = "./assets/images/yfixed.png";
const xy_fixed_image = "./assets/images/xyfixed.png";

default_elastic_modulus = 10**9;
default_area = 1;

// create an array with nodes
let nodes = new vis.DataSet([
    {x: -100, y: 0, fixed: true, physics: false, shape: "image", image: xy_fixed_image, size: 25},
    {x: 100, y: 0, fixed: true, physics: false, shape: "image", image: xy_fixed_image, size: 25},
]);

// create an array with edges
let edges = new vis.DataSet([]);

function update_edges() {
    // Get all widths
    let ids = edges.getIds();
    let areas = [];
    for (let i = 0; i < ids.length; i++) {
        areas.push(edges.get(ids[i]).area);
    }

    let minarea = Math.min(...areas);
    let darea = Math.max(...areas) - minarea;

    if (darea !== 0){
        for (let i = 0; i < ids.length; i++) {
            let edge = edges.get(ids[i]);
            let scaled_width = (areas[i] - minarea)/darea
            edge.width = scaled_width*(max_edge_width - min_edge_width) + min_edge_width;
            edges.update(edge);
        }
    }
}

// create a network
let container = document.getElementById('network');

let data = {
    nodes: nodes,
    edges: edges
};

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
            $("#nodeModalLabel").val(nodeData.id);
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
            editWithoutDrag: function(edgeData, callback) {
                edgeData = edges.get(edgeData.id)
                $("#edgeModalLabel").val(edgeData.id);
                $('#edgeModal').modal('show');
                $('#edge-area').val(edgeData.area);
                $('#edge-elastic-modulus').val(edgeData.elastic_modulus);
                callback(edgeData);
            }
        },
        deleteNode: true,
        deleteEdge: true,
    }
};

let network = new vis.Network(container, data, options);

$("#add-node").on('click', function (e) {
    deactivate("#add-edge");
    deactivate("#drag-node");
    $("#add-node").toggleClass("active");
    if ($("#add-node").hasClass('active') === true) {
        network.addNodeMode();
    } else {
        network.disableEditMode();
    }
})

$("#edit-node").on('click', function (e) {
    deactivate_all();
    network.editNode();
})

$("#drag-node").on('click', function (e) {
    deactivate("#add-edge");
    deactivate("#add-node");
    $("#drag-node").toggleClass("active");
    if ($("#drag-node").hasClass('active') === true) {
        options.interaction.dragNodes = true;
        network.setOptions(options);
    } else {
        options.interaction.dragNodes = false;
        network.setOptions(options);
    }
})







$("#add-edge").on('click', function (e) {
    deactivate("#add-node");
    deactivate("#drag-node");
    $("#add-edge").toggleClass("active");
    if ($("#add-edge").hasClass('active') === true) {
        network.addEdgeMode();
    } else {
        network.disableEditMode();
    }
})

$("#edit-edge").on('click', function (e) {
    deactivate_all();
    network.editEdgeMode();
    update_edges();
})








$("#delete").on('click', function (e) {
    deactivate_all();
    network.deleteSelected();
    update_edges();
})

$("#zoom-to-fit").on('click', function (e) {
    deactivate_all();
    network.disableEditMode();
    network.fit({animation: true})
})







$("#node-modal-apply").on('click', function (e) {
    let node = nodes.get($("#nodeModalLabel").val());
    node.fixed.x = $('#node-x-fixed').prop('checked');
    node.fixed.y = $('#node-y-fixed').prop('checked');
    node.x = parseInt($('#node-x-coord').val());
    node.y = parseInt($('#node-y-coord').val());
    node.size = 15;
    if (node.fixed.x === true && node.fixed.y === false) {
        node.shape = 'image';
        node.image = x_fixed_image;
        node.size = 25;
    } else if (node.fixed.x === false && node.fixed.y === true) {
        node.shape = 'image';
        node.image = y_fixed_image;
        node.size = 25;
    } else if (node.fixed.x === true && node.fixed.y === true) {
        node.shape = 'image';
        node.image = xy_fixed_image;
        node.size = 25;
    }
    nodes.update(node);
    $('#nodeModal').modal('hide');
})

$("#edge-modal-apply").on('click', function (e) {
    let edge = edges.get($("#edgeModalLabel").val());
    edge.area = parseFloat($('#edge-area').val());
    edge.elastic_modulus = parseFloat($('#edge-elastic-modulus').val());
    edges.update(edge);
    $('#edgeModal').modal('hide');
    update_edges();
})


$("#login-modal-apply").on('click', function (e) {
    $('#loginModal').modal('hide');
    $("#all").removeClass("d-none");
    network.fit();
})





function deactivate(name) {
    $(name).removeClass("active");
}

function deactivate_all() {
    deactivate("#add-node");
    deactivate("#add-edge");
    deactivate("#drag-node");
}
