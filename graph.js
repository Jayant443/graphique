class GraphNode {
    constructor(id, label, x, y) {
        this.id = id;
        this.label = label || id;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.fxed = false;
        this.element = null;
        this.circle = null;
    }

    createDOM(parentLayer) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "node-group");

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("class", "node");
        circle.setAttribute("r", "25");
        circle.dataset.id = this.id;

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("class", "node-label");
        text.setAttribute("dy", "5");
        text.textContent = this.label;

        g.appendChild(circle);
        g.appendChild(text);
        parentLayer.appendChild(g);

        text.addEventListener('pointerdown', (e) => {
            if (window.graphInstance && window.graphInstance.mode === 'select') {
                e.stopPropagation();
                window.graphInstance.showNodeLabelInput(this, e);
            }
        });

        this.element = g;
        this.circle = circle;
        this.updatePosition();
    }

    updatePosition() {
        if (this.element) {
            this.element.setAttribute("transform", `translate(${this.x}, ${-this.y})`);
        }
    }

    updateLabel(newLabel) {
        this.label = newLabel;
        if (this.element) {
            const textElement = this.element.querySelector('.node-label');
            if (textElement) textElement.textContent = newLabel;
        }
    }

    remove() {
        if (this.element) this.element.remove();
    }

    serialize() {
        return {
            id: this.id,
            label: this.label,
            x: this.x,
            y: this.y
        };
    }
}

class GraphEdge {
    constructor(source, target, isDirected = false, weight = 1) {
        this.source = source;
        this.target = target;
        this.isDirected = isDirected;
        this.weight = Number(weight) || 1;
        this.label = String(weight || "1");
        this.element = null;
        this.hitArea = null;
        this.group = null;
        this.labelGroup = null;
        this.labelText = null;
    }

    createDOM(parentLayer, isWeighted) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "edge-group");

        const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hitArea.setAttribute("class", "edge-hit-area");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", `edge ${this.isDirected ? 'directed' : ''}`);
        if (this.isDirected) path.setAttribute('marker-end', 'url(#arrowhead)');

        g.appendChild(hitArea);
        g.appendChild(path);

        const lg = document.createElementNS("http://www.w3.org/2000/svg", "g");
        lg.setAttribute("class", "edge-label-group");
        lg.style.display = isWeighted ? 'block' : 'none';

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("class", "edge-label-bg");
        rect.setAttribute("rx", "4");

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("class", "edge-label");
        text.textContent = this.label;

        lg.appendChild(rect);
        lg.appendChild(text);
        g.appendChild(lg);

        parentLayer.appendChild(g);

        this.element = path;
        this.hitArea = hitArea;
        this.group = g;
        this.labelGroup = lg;
        this.labelText = text;

        this.updateLabelElement();
    }

    updatePosition(siblings) {
        if (!this.element) return;

        const count = siblings.length;
        const index = siblings.indexOf(this);
        const sY = -this.source.y;
        const tY = -this.target.y;

        if (isNaN(this.source.x) || isNaN(sY) || isNaN(this.target.x) || isNaN(tY)) return;

        let d;
        let midX = (this.source.x + this.target.x) / 2;
        let midY = (sY + tY) / 2;

        if (count === 1) {
            d = `M ${this.source.x} ${sY} L ${this.target.x} ${tY}`;
        } else {
            const isSourceFirst = this.source.id < this.target.id;
            const node1 = isSourceFirst ? this.source : this.target;
            const node2 = isSourceFirst ? this.target : this.source;
            const n1vY = -node1.y;
            const n2vY = -node2.y;

            const dx = node2.x - node1.x;
            const dy = n2vY - n1vY;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const px = -dy / len;
            const py = dx / len;

            const step = 30;
            const offset = (index - (count - 1) / 2) * step;
            const bmx = (node1.x + node2.x) / 2;
            const bmy = (n1vY + n2vY) / 2;

            const cx = bmx + px * offset;
            const cy = bmy + py * offset;

            d = `M ${this.source.x} ${sY} Q ${cx} ${cy} ${this.target.x} ${tY}`;

            midX = 0.25 * this.source.x + 0.5 * cx + 0.25 * this.target.x;
            midY = 0.25 * sY + 0.5 * cy + 0.25 * tY;
        }

        this.element.setAttribute("d", d);
        this.hitArea.setAttribute("d", d);

        if (this.labelGroup && !isNaN(midX) && !isNaN(midY)) {
            this.labelGroup.setAttribute("transform", `translate(${midX}, ${midY})`);
            this.updateLabelElement();
        }
    }

    updateLabel(newVal) {
        this.label = newVal;
        const numericWeight = parseFloat(newVal);
        if (!isNaN(numericWeight)) this.weight = numericWeight;
        this.updateLabelElement();
    }

    updateLabelElement() {
        if (this.labelText) {
            this.labelText.textContent = this.label;
            try {
                const bbox = this.labelText.getBBox();
                const rect = this.labelGroup.querySelector('.edge-label-bg');
                if (rect) {
                    rect.setAttribute("x", bbox.x - 4);
                    rect.setAttribute("y", bbox.y - 2);
                    rect.setAttribute("width", bbox.width + 8);
                    rect.setAttribute("height", bbox.height + 4);
                }
            } catch (e) { }
        }
    }

    setDirected(isDirected) {
        this.isDirected = isDirected;
        if (this.element) {
            this.element.classList.toggle('directed', isDirected);
            if (isDirected) {
                this.element.setAttribute('marker-end', 'url(#arrowhead)');
            } else {
                this.element.removeAttribute('marker-end');
            }
        }
    }

    remove() {
        if (this.group) this.group.remove();
    }

    serialize() {
        return {
            sourceId: this.source.id,
            targetId: this.target.id,
            isDirected: this.isDirected,
            weight: this.weight,
            label: this.label
        };
    }
}

class GraphLogic {
    static getAdjacencyList(nodes, edges) {
        const adjList = new Map();
        nodes.forEach(n => adjList.set(n.id, []));
        edges.forEach(e => {
            adjList.get(e.source.id).push({ id: e.target.id, weight: e.weight });
            if (!e.isDirected) {
                adjList.get(e.target.id).push({ id: e.source.id, weight: e.weight });
            }
        });
        return adjList;
    }

    static hasCycle(nodes, edges, isDirectedMode) {
        const adjList = this.getAdjacencyList(nodes, edges);
        const visited = new Set();
        const recStack = new Set();

        const checkCycleDirected = (nodeId) => {
            if (recStack.has(nodeId)) return true;
            if (visited.has(nodeId)) return false;
            visited.add(nodeId);
            recStack.add(nodeId);
            const neighbors = adjList.get(nodeId);
            for (const neighbor of neighbors) {
                if (checkCycleDirected(neighbor.id)) return true;
            }
            recStack.delete(nodeId);
            return false;
        };

        const checkCycleUndirected = (nodeId, parentId) => {
            visited.add(nodeId);
            const neighbors = adjList.get(nodeId);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.id)) {
                    if (checkCycleUndirected(neighbor.id, nodeId)) return true;
                } else if (neighbor.id !== parentId) {
                    return true;
                }
            }
            return false;
        };

        if (isDirectedMode) {
            for (const node of nodes) {
                if (!visited.has(node.id)) {
                    if (checkCycleDirected(node.id)) return true;
                }
            }
        } else {
            for (const node of nodes) {
                if (!visited.has(node.id)) {
                    if (checkCycleUndirected(node.id, null)) return true;
                }
            }
        }
        return false;
    }

    static analyzeTree(nodes, edges, isDirectedMode) {
        if (nodes.length === 0) return { isTree: false };
        const adjList = this.getAdjacencyList(nodes, edges);
        const visited = new Set();
        const queue = [nodes[0].id];
        visited.add(nodes[0].id);

        let head = 0;
        while (head < queue.length) {
            const id = queue[head++];
            const neighbors = adjList.get(id) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.id)) {
                    visited.add(neighbor.id);
                    queue.push(neighbor.id);
                }
            }
        }

        const isConnected = visited.size === nodes.length;
        const isTree = isConnected &&
            edges.length === nodes.length - 1 &&
            !this.hasCycle(nodes, edges, isDirectedMode);

        if (!isTree) return { isTree: false };

        let root = nodes[0];
        if (isDirectedMode) {
            const inDegrees = new Map();
            nodes.forEach(n => inDegrees.set(n.id, 0));
            edges.forEach(e => inDegrees.set(e.target.id, inDegrees.get(e.target.id) + 1));
            root = nodes.find(n => inDegrees.get(n.id) === 0) || nodes[0];
        }

        const leaves = [];
        const childrenMap = new Map();
        nodes.forEach(node => {
            const outEdges = edges.filter(e => e.source.id === node.id).map(e => e.target.id);
            childrenMap.set(node.id, outEdges);
            if (outEdges.length === 0) leaves.push(node);
        });

        return { isTree: true, root, leaves, childrenMap };
    }
}

class Graph {
    constructor(containerId) {
        this.svg = document.getElementById(containerId);
        this.viewport = document.getElementById('viewport');
        this.edgesLayer = document.getElementById('edges-layer');
        this.nodesLayer = document.getElementById('nodes-layer');
        this.createAxisLines();
        this.nodes = new Map();
        this.edges = [];
        this.mode = 'select';
        this.selectedElement = null;
        this.edgeSourceNode = null;
        this.directedEdges = false;
        this.nextNodeName = "";

        const rect = this.svg.getBoundingClientRect();
        this.transform = {
            x: rect.width / 2,
            y: rect.height / 2,
            k: 1
        };

        this.repulsion = 400;
        this.attraction = 0.01;
        this.edgeLength = 200;
        this.damping = 0.7;
        this.isSleeping = false;
        this.energyThreshold = 0.01;
        this.onSelectionChange = null;
        this.onGraphUpdate = null;
        this.undoStack = [];
        this.redoStack = [];
        this.isRestoring = false;
        this.isWeighted = false;
        this.nodeCounter = 1;
        this.algorithms = new GraphAlgorithms(this);
        window.graphInstance = this;
        this.centerGraph();
        this.initInteractions();
        this.animate();
    }

    centerGraph() {
        const rect = this.svg.getBoundingClientRect();
        this.transform.x = rect.width / 2;
        this.transform.y = rect.height / 2;
        this.updateViewport();
    }

    createAxisLines() {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("id", "axis-lines-layer");

        const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
        xAxis.setAttribute("class", "axis-line");
        xAxis.setAttribute("x1", "-10000");
        xAxis.setAttribute("y1", "0");
        xAxis.setAttribute("x2", "10000");
        xAxis.setAttribute("y2", "0");

        const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
        yAxis.setAttribute("class", "axis-line");
        yAxis.setAttribute("x1", "0");
        yAxis.setAttribute("y1", "-10000");
        yAxis.setAttribute("x2", "0");
        yAxis.setAttribute("y2", "10000");

        group.appendChild(xAxis);
        group.appendChild(yAxis);
        this.viewport.insertBefore(group, this.edgesLayer);
    }

    isNodeNameUnique(name, excludeId = null) {
        for (const node of this.nodes.values()) {
            if (node.id !== excludeId && node.label === name) return false;
        }
        return true;
    }

    addNode(id, label, x, y) {
        if (this.nodes.has(id)) return;
        
        let uniqueLabel = label;
        let counter = 1;
        while (!this.isNodeNameUnique(uniqueLabel)) {
            uniqueLabel = `${label}_${counter++}`;
        }

        this.saveState();
        const node = new GraphNode(id, uniqueLabel, x, y);
        node.createDOM(this.nodesLayer);
        this.nodes.set(id, node);
        this.wake();
        this.notifyUpdate();
        return node;
    }

    removeNode(id) {
        this.saveState();
        const node = this.nodes.get(id);
        if (!node) return;

        this.edges = this.edges.filter(edge => {
            if (edge.source === node || edge.target === node) {
                edge.remove();
                return false;
            }
            return true;
        });

        node.remove();
        this.nodes.delete(id);
        this.notifyUpdate();
    }

    addEdge(sourceId, targetId, isDirected = false, weight = 1) {
        this.saveState();
        const source = this.nodes.get(sourceId);
        const target = this.nodes.get(targetId);
        if (!source || !target || source === target) return;

        const edge = new GraphEdge(source, target, isDirected, weight);
        edge.createDOM(this.edgesLayer, this.isWeighted);

        edge.group.addEventListener('pointerdown', (e) => {
            if (this.mode === 'select') {
                e.stopPropagation();
                this.selectEdge(edge);
            }
        });

        edge.labelGroup.addEventListener('pointerdown', (e) => {
            if (this.mode === 'select') {
                e.stopPropagation();
                this.showEdgeWeightInput(edge, e);
            }
        });

        this.edges.push(edge);
        this.wake();
        this.notifyUpdate();
        return edge;
    }

    removeEdge(sourceId, targetId) {
        this.saveState();
        this.edges = this.edges.filter(edge => {
            const match = (edge.source.id === sourceId && edge.target.id === targetId) ||
                (!edge.isDirected && edge.source.id === targetId && edge.target.id === sourceId);
            if (match) {
                edge.remove();
                return false;
            }
            return true;
        });
        this.notifyUpdate();
    }

    removeEdgeObject(edge) {
        this.saveState();
        this.edges = this.edges.filter(e => {
            if (e === edge) {
                e.remove();
                return false;
            }
            return true;
        });
        this.notifyUpdate();
    }

    clear() {
        if (!this.isRestoring) this.saveState();
        this.nodes.forEach(node => node.remove());
        this.edges.forEach(edge => edge.remove());
        this.nodes.clear();
        this.edges = [];
        this.nodeCounter = 1;
        this.selectedElement = null;
        this.wake();
        this.notifyUpdate();
    }

    serialize() {
        return {
            nodes: Array.from(this.nodes.values()).map(n => n.serialize()),
            edges: this.edges.map(e => e.serialize()),
            settings: {
                transform: this.transform,
                physics: {
                    repulsion: this.repulsion,
                    attraction: this.attraction,
                    edgeLength: this.edgeLength,
                    damping: this.damping
                },
                directedEdges: this.directedEdges,
                nextNodeName: this.nextNodeName,
                isWeighted: this.isWeighted
            }
        };
    }

    deserialize(state) {
        this.isRestoring = true;
        this.clear();
        if (state.settings) {
            if (state.settings.transform) {
                this.transform = state.settings.transform;
                this.updateViewport();
            }
            if (state.settings.physics) {
                this.repulsion = state.settings.physics.repulsion ?? this.repulsion;
                this.attraction = state.settings.physics.attraction ?? this.attraction;
                this.edgeLength = state.settings.physics.edgeLength ?? this.edgeLength;
                this.damping = state.settings.physics.damping ?? this.damping;
            }
            this.directedEdges = state.settings.directedEdges ?? this.directedEdges;
            this.nextNodeName = state.settings.nextNodeName ?? this.nextNodeName;
            this.isWeighted = state.settings.isWeighted ?? this.isWeighted;
        }
        state.nodes.forEach(n => this.addNode(n.id, n.label, n.x, n.y));
        state.edges.forEach(e => {
            this.addEdge(e.sourceId, e.targetId, e.isDirected, e.weight);
        });
        this.isRestoring = false;
        this.wake();
        this.notifyUpdate();
    }

    saveState() {
        if (this.isRestoring) return;
        const state = JSON.stringify(this.serialize());
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === state) return;
        this.undoStack.push(state);
        this.redoStack = [];
        if (this.undoStack.length > 50) this.undoStack.shift();
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const currentState = JSON.stringify(this.serialize());
        this.redoStack.push(currentState);
        const prevState = JSON.parse(this.undoStack.pop());
        this.deserialize(prevState);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const currentState = JSON.stringify(this.serialize());
        this.undoStack.push(currentState);
        const nextState = JSON.parse(this.redoStack.pop());
        this.deserialize(nextState);
    }

    notifyUpdate() {
        if (this.onGraphUpdate) {
            this.onGraphUpdate(this.getGraphData());
        }
    }

    getGraphData() {
        const nodesArr = Array.from(this.nodes.values());
        const adjList = GraphLogic.getAdjacencyList(nodesArr, this.edges);
        const treeInfo = GraphLogic.analyzeTree(nodesArr, this.edges, this.directedEdges);
        return { nodes: nodesArr, edges: this.edges, adjList: adjList, treeInfo: treeInfo };
    }

    batchUpdate(callback) {
        const wasRestoring = this.isRestoring;
        this.isRestoring = true;
        callback();
        this.isRestoring = wasRestoring;
        this.saveState();
        this.notifyUpdate();
        this.wake();
    }

    setMode(mode) {
        this.mode = mode;
        this.edgeSourceNode = null;
        this.deselectAll();
    }

    setVisualScale(property, value) {
        document.documentElement.style.setProperty(`--${property}`, `${value}px`);
    }

    setPhysicsProperty(prop, value) {
        if (this.hasOwnProperty(prop)) {
            this[prop] = parseFloat(value);
            this.wake();
        }
    }

    setWeighted(weighted) {
        this.saveState();
        this.isWeighted = weighted;
        this.edges.forEach(e => {
            if (e.labelGroup) e.labelGroup.style.display = weighted ? 'block' : 'none';
        });
        this.wake();
        this.notifyUpdate();
    }

    updateNodeLabel(id, newLabel) {
        const node = this.nodes.get(id);
        if (node) {
            if (!this.isNodeNameUnique(newLabel, id)) {
                alert(`The name "${newLabel}" is already in use. Please choose a unique name.`);
                if (this.selectedElement && this.selectedElement.type === 'node' && this.selectedElement.data.id === id) {
                    const nameInput = document.getElementById('input-node-name');
                    if (nameInput) nameInput.value = node.label;
                }
                return;
            }

            this.saveState();
            node.updateLabel(newLabel);
            this.notifyUpdate();
            if (this.selectedElement && this.selectedElement.type === 'node' && this.selectedElement.data.id === id) {
                const nameInput = document.getElementById('input-node-name');
                if (nameInput) nameInput.value = newLabel;
            }
        }
    }

    showNodeLabelInput(node, event) {
        document.querySelectorAll('.node-label-input').forEach(el => el.remove());

        const input = document.createElement('input');
        input.type = 'text';
        input.value = node.label;
        input.className = 'node-label-input';

        const matrix = node.element.getScreenCTM();
        const pt = this.svg.createSVGPoint();
        pt.x = 0;
        pt.y = 0;
        const screenPt = pt.matrixTransform(matrix);

        input.style.left = `${screenPt.x}px`;
        input.style.top = `${screenPt.y}px`;

        document.body.appendChild(input);

        setTimeout(() => {
            input.focus();
            input.select();
        }, 10);

        const save = () => {
            if (!input.parentElement) return;
            const newVal = input.value.trim();
            if (newVal !== node.label && newVal !== "") {
                this.updateNodeLabel(node.id, newVal);
            }
            input.remove();
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                input.remove();
            }
        });
    }

    updateEdgeLabel(edge, newVal) {
        this.saveState();
        edge.updateLabel(newVal);
        this.wake();
        this.notifyUpdate();
    }

    updateEdgeDirectedness(edge, isDirected) {
        this.saveState();
        edge.setDirected(isDirected);
        this.notifyUpdate();
        this.wake();
    }

    showEdgeWeightInput(edge, event) {
        document.querySelectorAll('.edge-weight-input').forEach(el => el.remove());

        const input = document.createElement('input');
        input.type = 'text';
        input.value = edge.label;
        input.className = 'edge-weight-input';

        const matrix = edge.labelGroup.getScreenCTM();
        const pt = this.svg.createSVGPoint();
        pt.x = 0;
        pt.y = 0;
        const screenPt = pt.matrixTransform(matrix);

        input.style.left = `${screenPt.x}px`;
        input.style.top = `${screenPt.y}px`;

        document.body.appendChild(input);

        setTimeout(() => {
            input.focus();
            input.select();
        }, 10);

        const save = () => {
            if (!input.parentElement) return;
            const newVal = input.value.trim();
            if (newVal !== edge.label && newVal !== "") {
                this.updateEdgeLabel(edge, newVal);
            }
            input.remove();
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                input.remove();
            }
        });
    }

    initInteractions() {
        let draggedNode = null;
        let isPanning = false;
        let startPoint = { x: 0, y: 0 };

        this.svg.addEventListener('pointerdown', (e) => {
            const target = e.target;
            const pt = this.getRelativePoint(e.clientX, e.clientY);

            if (this.mode === 'addNode') {
                const id = Date.now().toString();
                const name = this.nextNodeName || `${this.nodeCounter++}`;
                this.addNode(id, name, pt.x, pt.y);
                return;
            }

            if (target.classList.contains('node')) {
                const node = this.nodes.get(target.dataset.id);
                if (this.mode === 'addEdge') {
                    if (!this.edgeSourceNode) {
                        this.edgeSourceNode = node;
                        this.selectNode(node);
                    } else {
                        this.addEdge(this.edgeSourceNode.id, node.id, this.directedEdges);
                        this.edgeSourceNode = null;
                        this.deselectAll();
                    }
                } else if (this.mode === 'select') {
                    draggedNode = node;
                    draggedNode.fxed = true;
                    this.selectNode(node);
                    this.svg.setPointerCapture(e.pointerId);
                    this.wake();
                }
            } else if (!target.classList.contains('edge-hit-area')) {
                if (this.mode === 'select') {
                    isPanning = true;
                    startPoint = { x: e.clientX, y: e.clientY };
                    this.deselectAll();
                }
            }
        });

        this.svg.addEventListener('pointermove', (e) => {
            if (draggedNode) {
                const pt = this.getRelativePoint(e.clientX, e.clientY);
                draggedNode.x = pt.x;
                draggedNode.y = pt.y;
                draggedNode.vx = 0; draggedNode.vy = 0;
                draggedNode.updatePosition();
                this.updateConnectedEdges(draggedNode);
                this.wake();
            } else if (isPanning) {
                const dx = e.clientX - startPoint.x;
                const dy = e.clientY - startPoint.y;
                this.transform.x += dx;
                this.transform.y += dy;
                startPoint = { x: e.clientX, y: e.clientY };
                this.updateViewport();
            }
        });

        const stop = () => {
            if (draggedNode) {
                draggedNode.fxed = false;
                this.saveState();
            }
            draggedNode = null;
            isPanning = false;
        };

        this.svg.addEventListener('pointerup', stop);
        this.svg.addEventListener('pointercancel', stop);

        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = Math.pow(1.1, -e.deltaY / 100);
            const pt = this.getRelativePoint(e.clientX, e.clientY);
            const newScale = this.transform.k * factor;
            this.transform.x -= pt.x * (newScale - this.transform.k);
            this.transform.y -= pt.y * (newScale - this.transform.k);
            this.transform.k = newScale;
            this.updateViewport();
        }, { passive: false });
    }

    getRelativePoint(clientX, clientY) {
        const rect = this.svg.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.transform.x) / this.transform.k,
            y: -(clientY - rect.top - this.transform.y) / this.transform.k
        };
    }

    updateViewport() {
        this.viewport.setAttribute("transform", `translate(${this.transform.x}, ${this.transform.y}) scale(${this.transform.k})`);
    }

    selectNode(node) {
        this.deselectAll();
        node.circle.classList.add('selected');
        this.selectedElement = { type: 'node', data: node };
        if (this.onSelectionChange) this.onSelectionChange(this.selectedElement);
    }

    selectEdge(edge) {
        this.deselectAll();
        edge.element.classList.add('selected');
        this.selectedElement = { type: 'edge', data: edge };
        if (this.onSelectionChange) this.onSelectionChange(this.selectedElement);
    }

    deselectAll() {
        this.nodes.forEach(n => n.circle.classList.remove('selected'));
        this.edges.forEach(e => e.element.classList.remove('selected'));
        this.selectedElement = null;
        if (this.onSelectionChange) this.onSelectionChange(null);
    }

    deleteSelected() {
        if (!this.selectedElement) return;
        if (this.selectedElement.type === 'node') {
            this.removeNode(this.selectedElement.data.id);
        } else if (this.selectedElement.type === 'edge') {
            this.removeEdgeObject(this.selectedElement.data);
        }
        this.selectedElement = null;
        if (this.onSelectionChange) this.onSelectionChange(null);
        this.wake();
        this.notifyUpdate();
    }

    wake() {
        if (this.isSleeping) {
            this.isSleeping = false;
            this.animate();
        }
    }

    animate() {
        if (this.isSleeping) return;
        const step = () => {
            if (this.isSleeping) return;
            const totalEnergy = this.applyPhysics();
            this.nodes.forEach(node => node.updatePosition());
            this.edges.forEach(edge => {
                const siblings = this.getSiblings(edge);
                edge.updatePosition(siblings);
            });

            if (this.onAnimationStep) {
                this.onAnimationStep(Array.from(this.nodes.values()));
            }

            if (totalEnergy < this.energyThreshold) {
                this.isSleeping = true;
                this.nodes.forEach(node => { node.vx = 0; node.vy = 0; });
                return;
            }
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    applyPhysics() {
        const nodesArr = Array.from(this.nodes.values());
        let totalEnergy = 0;

        for (let i = 0; i < nodesArr.length; i++) {
            for (let j = i + 1; j < nodesArr.length; j++) {
                const n1 = nodesArr[i]; const n2 = nodesArr[j];
                const dx = n2.x - n1.x; const dy = n2.y - n1.y;
                const distSq = dx * dx + dy * dy || 1;
                const force = this.repulsion / distSq;
                const fx = (dx / Math.sqrt(distSq)) * force;
                const fy = (dy / Math.sqrt(distSq)) * force;
                n1.vx -= fx; n1.vy -= fy;
                n2.vx += fx; n2.vy += fy;
            }
        }

        this.edges.forEach(edge => {
            const dx = edge.target.x - edge.source.x;
            const dy = edge.target.y - edge.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetLength = this.edgeLength;
            const force = (dist - targetLength) * this.attraction;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            edge.source.vx += fx; edge.source.vy += fy;
            edge.target.vx -= fx; edge.target.vy -= fy;
        });

        nodesArr.forEach(node => {
            if (!node.fxed) {
                node.x += node.vx; node.y += node.vy;
                node.vx *= this.damping; node.vy *= this.damping;
            }
            totalEnergy += node.vx * node.vx + node.vy * node.vy;
        });
        return totalEnergy;
    }

    getSiblings(edge) {
        return this.edges.filter(e =>
            (e.source === edge.source && e.target === edge.target) ||
            (e.source === edge.target && e.target === edge.source)
        );
    }

    updateConnectedEdges(node) {
        this.edges.forEach(edge => {
            if (edge.source === node || edge.target === node) {
                const siblings = this.getSiblings(edge);
                edge.updatePosition(siblings);
            }
        });
    }

    stopAlgorithm() {
        if (this.algoController) this.algoController.aborted = true;
        this.clearHighlights();
    }

    clearHighlights() {
        this.nodes.forEach(n => {
            if (n.circle) n.circle.classList.remove('visited', 'processing');
        });
        this.edges.forEach(e => {
            if (e.element) e.element.classList.remove('traversed');
        });
    }
}
