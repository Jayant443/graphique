const graph = new Graph('graph-container');
const buttons = {
    select: document.getElementById('btn-select'),
    addNode: document.getElementById('btn-add-node'),
    addEdge: document.getElementById('btn-add-edge'),
    delete: document.getElementById('btn-delete'),
    clear: document.getElementById('btn-clear'),
    nodeSize: document.getElementById('slider-node-size'),
    nodeSizeVal: document.getElementById('val-node-size'),
    edgeLength: document.getElementById('slider-edge-length'),
    edgeLengthVal: document.getElementById('val-edge-length'),
    directed: document.getElementById('check-directed'),
    nodeNameInput: document.getElementById('input-node-name')
};
function setActiveButton(activeId) {
    Object.entries(buttons).forEach(([id, btn]) => {
        if (btn && btn.tagName === 'BUTTON') {
            btn.classList.toggle('active', id === activeId);
        }
    });
}
buttons.select.addEventListener('click', () => {
    graph.setMode('select');
    setActiveButton('select');
});
buttons.addNode.addEventListener('click', () => {
    graph.setMode('addNode');
    setActiveButton('addNode');
});
buttons.addEdge.addEventListener('click', () => {
    graph.setMode('addEdge');
    setActiveButton('addEdge');
});
buttons.delete.addEventListener('click', () => {
    graph.deleteSelected();
});
buttons.clear.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the entire graph?')) {
        graph.clear();
    }
});
buttons.nodeSize.addEventListener('input', (e) => {
    graph.setVisualScale('node-radius', e.target.value);
    buttons.nodeSizeVal.textContent = e.target.value;
});
buttons.edgeLength.addEventListener('input', (e) => {
    graph.setPhysicsProperty('edgeLength', e.target.value);
    buttons.edgeLengthVal.textContent = e.target.value;
});
buttons.directed.addEventListener('change', (e) => {
    graph.directedEdges = e.target.checked;
});
buttons.nodeNameInput.addEventListener('input', (e) => {
    const val = e.target.value;
    graph.nextNodeName = val;
    if (graph.selectedElement && graph.selectedElement.type === 'node') {
        graph.updateNodeLabel(graph.selectedElement.data.id, val);
    }
});
graph.onSelectionChange = (selection) => {
    if (selection && selection.type === 'node') {
        buttons.nodeNameInput.value = selection.data.label;
    } else {
        buttons.nodeNameInput.value = graph.nextNodeName;
    }
};
window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return;
    if (e.key === 's' || e.key === 'S') buttons.select.click();
    if (e.key === 'n' || e.key === 'N') buttons.addNode.click();
    if (e.key === 'e' || e.key === 'E') buttons.addEdge.click();
    if (e.key === 'Delete' || e.key === 'Backspace') graph.deleteSelected();
});
const svgWidth = 1000;
const svgHeight = 600;
const centerX = svgWidth / 2;
const startY = 100;
const levelHeight = 120;
const horizontalGap = 200;

const demoNodes = [
    { id: '1', label: 'Root', x: centerX, y: startY },
    { id: '2', label: 'A', x: centerX - horizontalGap, y: startY + levelHeight },
    { id: '3', label: 'B', x: centerX + horizontalGap, y: startY + levelHeight },
    { id: '4', label: 'C', x: centerX - horizontalGap - horizontalGap/2, y: startY + 2 * levelHeight },
    { id: '5', label: 'D', x: centerX - horizontalGap + horizontalGap/2, y: startY + 2 * levelHeight },
    { id: '6', label: 'E', x: centerX + horizontalGap - horizontalGap/2, y: startY + 2 * levelHeight },
    { id: '7', label: 'F', x: centerX + horizontalGap + horizontalGap/2, y: startY + 2 * levelHeight }
];

demoNodes.forEach(n => graph.addNode(n.id, n.label, n.x, n.y));
graph.addEdge('1', '2');
graph.addEdge('1', '3');
graph.addEdge('2', '4');
graph.addEdge('2', '5');
graph.addEdge('3', '6');
graph.addEdge('3', '7');
