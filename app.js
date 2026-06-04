const graph = new Graph('graph-container');
const buttons = {
    select: document.getElementById('btn-select'),
    addNode: document.getElementById('btn-add-node'),
    addEdge: document.getElementById('btn-add-edge'),
    delete: document.getElementById('btn-delete'),
    clear: document.getElementById('btn-clear'),
    undo: document.getElementById('btn-undo'),
    redo: document.getElementById('btn-redo'),
    export: document.getElementById('btn-export'),
    import: document.getElementById('btn-import'),
    importInput: document.getElementById('input-import'),
    download: document.getElementById('btn-download'),
    nodeSize: document.getElementById('slider-node-size'),
    nodeSizeVal: document.getElementById('val-node-size'),
    edgeLength: document.getElementById('slider-edge-length'),
    edgeLengthVal: document.getElementById('val-edge-length'),
    directed: document.getElementById('check-directed'),
    nodeNameInput: document.getElementById('input-node-name'),
    graphType: document.getElementById('select-graph-type'),
    more: document.getElementById('btn-more'),
    moreMenu: document.getElementById('more-options-menu'),
    algoSelect: document.getElementById('select-algo'),
    runAlgo: document.getElementById('btn-run-algo'),
    stopAlgo: document.getElementById('btn-stop-algo'),
    vizPanel: document.getElementById('viz-panel'),
    vizQueue: document.getElementById('viz-queue'),
    vizOrder: document.getElementById('viz-order'),
    vizAlgoName: document.getElementById('viz-algo-name'),
    vizStructureLabel: document.getElementById('viz-structure-label')
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
    buttons.nodeNameInput.value = '';
    graph.nextNodeName = '';
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
buttons.undo.addEventListener('click', () => graph.undo());
buttons.redo.addEventListener('click', () => graph.redo());

if (buttons.more && buttons.moreMenu) {
    buttons.more.onclick = (e) => {
        e.stopPropagation();
        buttons.moreMenu.classList.toggle('show');
    };

    window.onclick = (e) => {
        if (!e.target.closest('.dropdown-container')) {
            buttons.moreMenu.classList.remove('show');
        }
    };

    buttons.moreMenu.onclick = (e) => {
        if (e.target.closest('button')) {
            buttons.moreMenu.classList.remove('show');
        }
    };
}

buttons.export.addEventListener('click', () => {
    const data = JSON.stringify(graph.serialize(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

buttons.import.addEventListener('click', () => buttons.importInput.click());
buttons.importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            graph.deserialize(data);
            if (data.settings) {
                if (data.settings.physics) {
                    buttons.edgeLength.value = data.settings.physics.edgeLength;
                    buttons.edgeLengthVal.textContent = data.settings.physics.edgeLength;
                }
                buttons.directed.checked = data.settings.directedEdges;
                buttons.nodeNameInput.value = data.settings.nextNodeName || "";
                buttons.graphType.value = data.settings.isWeighted ? 'weighted' : 'unweighted';
            }
        } catch (err) {
            alert('Error importing graph: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

buttons.download.addEventListener('click', () => {
    const svg = document.getElementById('graph-container');
    const svgClone = svg.cloneNode(true);
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --node-fill: #ffffff;
            --node-stroke: #6c6dd5;
            --edge-stroke: #c8cede;
            --primary-color: #5b5bd6;
            --primary-hover: #4848bd;
            --text-color: #1c2440;
            --edge-width: 2px;
            --node-radius: 25px;
        }
        .node { fill: var(--node-fill); stroke: var(--node-stroke); stroke-width: 2px; }
        .node-label { font-size: 15px; font-weight: 600; text-anchor: middle; fill: var(--text-color); font-family: sans-serif; }
        .edge { stroke: var(--edge-stroke); stroke-width: var(--edge-width); fill: none; }
        .edge.directed { marker-end: url(#arrowhead); }
        .edge.selected { stroke: #5b5bd6; stroke-width: 4px; }
        .edge-label-bg { fill: white; fill-opacity: 0.94; stroke: #e5e9f2; }
        .edge-label { font-size: 11px; font-weight: 700; text-anchor: middle; fill: #525b73; font-family: sans-serif; }
        .edge.traversed { stroke: var(--primary-color); stroke-width: 3px; }
        .node.visited { fill: #e2faf5; stroke: #10b9a6; }
        .node.processing { fill: var(--primary-color); stroke: var(--primary-hover); }
    `;
    svgClone.prepend(style);
    const width = svg.clientWidth;
    const height = svg.clientHeight;
    svgClone.setAttribute('width', width);
    svgClone.setAttribute('height', height);
    svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = width * 2;
    canvas.height = height * 2;
    
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `graph-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    };
    img.onerror = (e) => {
        console.error('Error loading SVG for image export', e);
        alert('Failed to export image. Try again.');
    };
    img.src = url;
});

buttons.nodeSize.addEventListener('input', (e) => {
    graph.setVisualScale('node-radius', e.target.value);
    buttons.nodeSizeVal.textContent = e.target.value;
});
buttons.edgeLength.addEventListener('input', (e) => {
    graph.setPhysicsProperty('edgeLength', e.target.value);
    buttons.edgeLengthVal.textContent = e.target.value;
});

const panelElements = {
    adjList: document.getElementById('adj-list-container'),
    adjMatrix: document.getElementById('adj-matrix-table')
};

graph.onGraphUpdate = (data) => {
    const { nodes, adjList, treeInfo } = data;
    const isTree = treeInfo.isTree;
    const header = document.querySelector('.panel-section-header');
    let badge = header.querySelector('.status-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'status-badge';
        header.appendChild(badge);
    }
    badge.textContent = isTree ? 'Tree Detected' : 'General Graph';
    badge.className = `status-badge ${isTree ? 'badge-tree' : 'badge-graph'}`;

    let listHtml = '';
    adjList.forEach((neighbors, nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        const neighborLabels = neighbors.map(neighbor => {
            const target = nodes.find(n => n.id === neighbor.id);
            return graph.isWeighted ? `${target.label}(${neighbor.weight})` : target.label;
        });
        listHtml += `
            <div class="adj-list-item" data-source-id="${node.id}">
                <div class="adj-list-header">
                    <span class="adj-list-node">${node.label}:</span>
                    <span class="adj-list-neighbors" contenteditable="true" spellcheck="false">${neighborLabels.join(', ') || ' '}</span>
                </div>
            </div>`;
    });
    panelElements.adjList.innerHTML = listHtml || 'No nodes';

    if (nodes.length > 0) {
        let matrixHtml = '<tr><th></th>' + nodes.map(n => `<th>${n.label[0]}</th>`).join('') + '</tr>';
        nodes.forEach(rowNode => {
            matrixHtml += `<tr><th>${rowNode.label[0]}</th>`;
            nodes.forEach(colNode => {
                const connection = adjList.get(rowNode.id).find(n => n.id === colNode.id);
                const cellValue = connection ? (graph.isWeighted ? connection.weight : '1') : '0';
                matrixHtml += `<td contenteditable="true" data-source-id="${rowNode.id}" data-target-id="${colNode.id}">${cellValue}</td>`;
            });
            matrixHtml += '</tr>';
        });
        panelElements.adjMatrix.innerHTML = matrixHtml;
    } else {
        panelElements.adjMatrix.innerHTML = '';
    }

    graph.edges.forEach(edge => {
        if (edge.labelGroup) {
            edge.labelGroup.style.display = (graph.isWeighted && !isTree) ? 'block' : 'none';
        }
    });
};

panelElements.adjList.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('adj-list-neighbors')) {
        graph.notifyUpdate();
    }
});

panelElements.adjMatrix.addEventListener('focusout', (e) => {
    if (e.target.tagName === 'TD') {
        const sourceId = e.target.dataset.sourceId;
        const targetId = e.target.dataset.targetId;
        const val = e.target.textContent.trim();
        const weight = parseFloat(val);

        if (val === '0' || isNaN(weight)) {
            graph.removeEdge(sourceId, targetId);
        } else {
            let edge = graph.edges.find(e => 
                (e.source.id === sourceId && e.target.id === targetId) ||
                (!graph.directedEdges && e.source.id === targetId && e.target.id === sourceId)
            );
            if (!edge) {
                edge = graph.addEdge(sourceId, targetId, graph.directedEdges);
            }
            if (edge && graph.isWeighted) {
                graph.updateEdgeLabel(edge, val);
            }
        }
        graph.notifyUpdate();
        graph.wake();
    }
});

panelElements.adjMatrix.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
    }
});

panelElements.adjList.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (e.target.classList.contains('adj-list-neighbors')) {
            const item = e.target.closest('.adj-list-item');
            const sourceId = item.dataset.sourceId;
            const text = e.target.textContent.trim();
            const labels = text.split(',').map(l => l.trim()).filter(l => l.length > 0);
            
            graph.batchUpdate(() => {
                const isDirected = graph.directedEdges;
                graph.edges = graph.edges.filter(edge => {
                    const isMatch = edge.source.id === sourceId || (!isDirected && edge.target.id === sourceId);
                    if (isMatch) {
                        edge.group.remove();
                        return false;
                    }
                    return true;
                });

                const nodesArr = Array.from(graph.nodes.values());
                labels.forEach(label => {
                    const match = label.match(/^([^(]+)(?:\(([^)]+)\))?$/);
                    if (match) {
                        const nodeLabel = match[1].trim();
                        const weightStr = match[2];
                        const targetNode = nodesArr.find(n => n.label === nodeLabel);
                        if (targetNode) {
                            const edge = graph.addEdge(sourceId, targetNode.id, graph.directedEdges);
                            if (edge && weightStr !== undefined) {
                                graph.updateEdgeLabel(edge, weightStr);
                            }
                        }
                    }
                });
            });
            e.target.blur();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        e.target.blur();
    }
});

graph.notifyUpdate();

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
buttons.graphType.addEventListener('change', (e) => {
    graph.setWeighted(e.target.value === 'weighted');
});

let isAlgoRunning = false;
let shortestPathSource = null;
let shortestPathTarget = null;

buttons.algoSelect.addEventListener('change', () => {
    const val = buttons.algoSelect.value;
    isAlgoRunning = false;
    graph.stopAlgorithm();
    buttons.runAlgo.style.display = 'block';
    buttons.stopAlgo.style.display = 'none';

    shortestPathSource = null;
    shortestPathTarget = null;

    if (val === 'shortest-path') {
        buttons.runAlgo.disabled = true;
        buttons.vizAlgoName.textContent = 'Shortest Path';
        buttons.vizStructureLabel.textContent = 'Status';
        buttons.vizQueue.innerHTML = '<div class="empty-state">Select Source Node</div>';
        buttons.vizOrder.innerHTML = '<div class="empty-state">No path computed</div>';
    } else {
        buttons.runAlgo.disabled = (val === 'none' || !graph.selectedElement || graph.selectedElement.type !== 'node');
        if (val === 'none') {
            buttons.vizPanel.classList.remove('active');
            graph.clearHighlights();
        } else {
            buttons.vizAlgoName.textContent = val === 'bfs' ? 'BFS State' : 'DFS State';
            buttons.vizStructureLabel.textContent = val === 'bfs' ? 'Queue' : 'Recursion Stack';
        }
    }
});

buttons.runAlgo.addEventListener('click', async () => {
    if (isAlgoRunning) return;
    
    const algo = buttons.algoSelect.value;
    
    if (algo === 'shortest-path') {
        if (!shortestPathSource || !shortestPathTarget) return;
        
        isAlgoRunning = true;
        buttons.runAlgo.style.display = 'none';
        buttons.stopAlgo.style.display = 'block';
        buttons.vizPanel.classList.add('active');

        const result = await graph.runShortestPath(shortestPathSource.id, shortestPathTarget.id, (state) => {
            buttons.vizQueue.innerHTML = `<div class="status-info">${state.message}</div>`;
        });

        if (result && result.path) {
            buttons.vizOrder.innerHTML = `
                <div class="path-result">
                    <div class="total-dist">Distance: ${result.distance}</div>
                    <div class="viz-nodes-row">
                        ${result.path.map(node => `<span class="viz-node">${node.label}</span>`).join(' → ')}
                    </div>
                </div>`;
        } else {
            buttons.vizOrder.innerHTML = '<div class="empty-state">No path found</div>';
        }

        isAlgoRunning = false;
        buttons.runAlgo.style.display = 'block';
        buttons.stopAlgo.style.display = 'none';
        return;
    }

    if (!graph.selectedElement || graph.selectedElement.type !== 'node') return;
    
    isAlgoRunning = true;
    buttons.runAlgo.style.display = 'none';
    buttons.stopAlgo.style.display = 'block';
    buttons.vizPanel.classList.add('active');
    
    const startNode = graph.selectedElement.data;
    
    const updateViz = (state) => {
        buttons.vizQueue.innerHTML = state.queue && state.queue.length > 0 
            ? state.queue.map(label => `<span class="viz-node">${label}</span>`).join('')
            : (state.stack && state.stack.length > 0
                ? state.stack.map(label => `<span class="viz-node">${label}</span>`).join('')
                : `<div class="empty-state">${algo === 'bfs' ? 'Queue' : 'Stack'} is empty</div>`);
        
        buttons.vizOrder.innerHTML = state.order.length > 0
            ? state.order.map((label, i) => `<span class="viz-node ${label === state.currentNode ? 'current' : ''}">${label}</span>`).join('')
            : '<div class="empty-state">No nodes visited</div>';
    };

    if (algo === 'bfs') {
        await graph.runBFS(startNode.id, updateViz);
    } else if (algo === 'dfs') {
        await graph.runDFS(startNode.id, updateViz);
    }
    
    if (isAlgoRunning) {
        isAlgoRunning = false;
        buttons.runAlgo.style.display = 'block';
        buttons.stopAlgo.style.display = 'none';
    }
});

buttons.stopAlgo.addEventListener('click', () => {
    isAlgoRunning = false;
    graph.stopAlgorithm();
    buttons.runAlgo.style.display = 'block';
    buttons.stopAlgo.style.display = 'none';
    
    if (buttons.algoSelect.value === 'shortest-path') {
        shortestPathSource = null;
        shortestPathTarget = null;
        buttons.vizQueue.innerHTML = '<div class="empty-state">Select Source Node</div>';
        buttons.vizOrder.innerHTML = '<div class="empty-state">No path computed</div>';
    } else {
        buttons.vizQueue.innerHTML = '<div class="empty-state">Empty</div>';
        buttons.vizOrder.innerHTML = '<div class="empty-state">No nodes visited</div>';
    }
});

graph.onSelectionChange = (selection) => {
    const algo = buttons.algoSelect.value;

    if (algo === 'shortest-path' && selection && selection.type === 'node') {
        if (!shortestPathSource) {
            shortestPathSource = selection.data;
            selection.data.element.querySelector('.node').classList.add('processing');
            buttons.vizQueue.innerHTML = '<div class="empty-state">Select Target Node</div>';
        } else if (!shortestPathTarget && selection.data !== shortestPathSource) {
            shortestPathTarget = selection.data;
            selection.data.element.querySelector('.node').classList.add('processing');
            buttons.runAlgo.disabled = false;
            buttons.vizQueue.innerHTML = '<div class="empty-state">Ready to Run</div>';
        }
        return;
    }

    if (selection && selection.type === 'node') {
        buttons.nodeNameInput.value = selection.data.label;
        if (buttons.algoSelect.value !== 'none' && buttons.algoSelect.value !== 'shortest-path') buttons.runAlgo.disabled = false;
    } else {
        buttons.nodeNameInput.value = graph.nextNodeName;
        if (buttons.algoSelect.value !== 'shortest-path') buttons.runAlgo.disabled = true;
    }
};

window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
    if (e.key === 's' || e.key === 'S') buttons.select.click();
    if (e.key === 'n' || e.key === 'N') buttons.addNode.click();
    if (e.key === 'e' || e.key === 'E') buttons.addEdge.click();
    if (e.key === 'Delete' || e.key === 'Backspace') graph.deleteSelected();

    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) graph.redo();
        else graph.undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        graph.redo();
    }
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
