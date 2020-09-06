const editable_color = "red";
const fixed_color = "blue";
const edge_color = "green";

const x_fixed_image = "";
const y_fixed_image = "";
const xy_fixed_image = "";

// create an array with nodes
let nodes = new vis.DataSet([
    {x: -100, y: 0, fixed: true, physics: false, shape: "square", size: 15, color: fixed_color},
    {x: 100, y: 0, fixed: true, physics: false, shape: "square", size: 15, color: fixed_color},
]);

// create an array with edges
let edges = new vis.DataSet([]);

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
                callback(edgeData);
            }
            network.addEdgeMode();
        },
        editEdge: {
            editWithoutDrag: function(edgeData, callback) {
                $('#edgeModal').modal('show');
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
    $("#add-node").toggleClass("active");
    if ($("#add-node").hasClass('active') === true) {
        network.addNodeMode();
    } else {
        network.disableEditMode();
    }
})

$("#add-edge").on('click', function (e) {
    deactivate("#add-node");
    $("#add-edge").toggleClass("active");
    if ($("#add-edge").hasClass('active') === true) {
        network.addEdgeMode();
    } else {
        network.disableEditMode();
    }
})

$("#edit-node").on('click', function (e) {
    deactivate_all();
    network.editNode();
})

$("#edit-edge").on('click', function (e) {
    deactivate_all();
    network.editEdgeMode();
})

$("#delete").on('click', function (e) {
    deactivate_all();
    network.deleteSelected();
})

$("#zoom-to-fit").on('click', function (e) {
    deactivate_all();
    network.disableEditMode();
    network.fit({animation: true})
})

$("#node-modal-apply").on('click', function (e) {
    console.log($("#nodeModalLabel").val());
    let node = nodes.get($("#nodeModalLabel").val());
    node.fixed.x = $('#node-x-fixed').prop('checked');
    node.fixed.y = $('#node-y-fixed').prop('checked');
    node.x = parseInt($('#node-x-coord').val());
    node.y = parseInt($('#node-y-coord').val());
    nodes.update(node);
    $('#nodeModal').modal('hide');
})

$("#edge-modal-apply").on('click', function (e) {
    $('#edgeModal').modal('hide');
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
}
