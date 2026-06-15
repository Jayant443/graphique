class GraphAlgorithms {
    constructor(graph) {
        this.graph = graph;
    }

    async waitIfPaused(controller) {
        while (controller.paused && !controller.aborted) {
            await new Promise(r => setTimeout(r, 100));
        }
    }

    async runBFS(startNodeId, onStep) {
        this.graph.clearHighlights();
        const startNode = this.graph.nodes.get(startNodeId);
        if (!startNode) return;

        const controller = { aborted: false, paused: false };
        this.graph.algoController = controller;

        const queue = [startNode];
        const visited = new Set([startNodeId]);
        const order = [];

        startNode.element.querySelector('.node').classList.add('processing');
        if (onStep) onStep({ queue: queue.map(n => n.label), order: order.map(n => n.label) });

        while (queue.length > 0 && !controller.aborted) {
            await this.waitIfPaused(controller);
            if (controller.aborted) break;

            const current = queue.shift();
            order.push(current);

            current.element.querySelector('.node').classList.remove('processing');
            current.element.querySelector('.node').classList.add('visited');

            if (onStep) onStep({
                queue: queue.map(n => n.label),
                order: order.map(n => n.label),
                currentNode: current.label
            });

            await new Promise(r => setTimeout(r, 800));
            await this.waitIfPaused(controller);
            if (controller.aborted) break;

            const neighbors = this.graph.getGraphData().adjList.get(current.id);
            for (const neighbor of neighbors) {
                await this.waitIfPaused(controller);
                if (controller.aborted) break;
                if (!visited.has(neighbor.id)) {
                    visited.add(neighbor.id);
                    const neighborNode = this.graph.nodes.get(neighbor.id);

                    const edge = this.graph.edges.find(e =>
                        (e.source === current && e.target === neighborNode) ||
                        (!e.isDirected && e.source === neighborNode && e.target === current)
                    );
                    if (edge) edge.element.classList.add('traversed');

                    neighborNode.element.querySelector('.node').classList.add('processing');
                    queue.push(neighborNode);

                    if (onStep) onStep({
                        queue: queue.map(n => n.label),
                        order: order.map(n => n.label)
                    });
                    await new Promise(r => setTimeout(r, 400));
                }
            }
        }
        this.graph.algoController = null;
    }

    async runDijkstra(startNodeId, onStep) {
        this.graph.clearHighlights();
        const startNode = this.graph.nodes.get(startNodeId);
        if (!startNode) return;

        const controller = { aborted: false, paused: false };
        this.graph.algoController = controller;

        const { nodes: nodesArr, adjList } = this.graph.getGraphData();
        const V = nodesArr.length;

        const idToIndex = new Map();
        const indexToNode = [];
        nodesArr.forEach((node, i) => {
            idToIndex.set(node.id, i);
            indexToNode[i] = node;
        });

        const dist = new Array(V).fill(Infinity);
        const visited = new Array(V).fill(false);
        const order = [];
        const startIndex = idToIndex.get(startNodeId);
        dist[startIndex] = 0;

        const getVizState = (uIndex = -1) => {
            const distances = {};
            indexToNode.forEach((node, i) => {
                distances[node.label] = dist[i] === Infinity ? '∞' : dist[i];
            });
            const queue = indexToNode.filter((node, i) => !visited[i] && dist[i] !== Infinity).map(node => node.label);

            return {
                queue: queue,
                pq: queue,
                order: order.map(n => n.label),
                currentNode: uIndex !== -1 ? indexToNode[uIndex].label : null,
                distances: distances
            };
        };

        if (onStep) onStep(getVizState());

        for (let i = 0; i < V; i++) {
            await this.waitIfPaused(controller);
            if (controller.aborted) break;

            let u = -1;
            for (let v = 0; v < V; v++) {
                if (!visited[v] && (u === -1 || dist[v] < dist[u])) {
                    u = v;
                }
            }

            if (u === -1 || dist[u] === Infinity) break;

            const uNode = indexToNode[u];
            visited[u] = true;
            order.push(uNode);

            uNode.element.querySelector('.node').classList.add('processing');
            if (onStep) onStep(getVizState(u));

            await new Promise(r => setTimeout(r, 800));
            await this.waitIfPaused(controller);
            if (controller.aborted) break;

            uNode.element.querySelector('.node').classList.remove('processing');
            uNode.element.querySelector('.node').classList.add('visited');

            const neighbors = adjList.get(uNode.id) || [];
            for (const neighbor of neighbors) {
                const v = idToIndex.get(neighbor.id);
                if (!visited[v]) {
                    const alt = dist[u] + neighbor.weight;
                    if (alt < dist[v]) {
                        dist[v] = alt;

                        const vNode = indexToNode[v];
                        const edge = this.graph.edges.find(e =>
                            (e.source.id === uNode.id && e.target.id === vNode.id) ||
                            (!e.isDirected && e.source.id === vNode.id && e.target.id === uNode.id)
                        );
                        if (edge) edge.element.classList.add('traversed');

                        if (onStep) onStep(getVizState(u));
                        await new Promise(r => setTimeout(r, 400));
                    }
                }
            }
        }
        this.graph.algoController = null;
    }

    async runDFS(startNodeId, onStep) {
        this.graph.clearHighlights();
        const startNode = this.graph.nodes.get(startNodeId);
        if (!startNode) return;

        const controller = { aborted: false, paused: false };
        this.graph.algoController = controller;

        const visited = new Set();
        const order = [];
        const stack = [];

        const dfs = async (node) => {
            await this.waitIfPaused(controller);
            if (controller.aborted) return;

            visited.add(node.id);
            order.push(node);
            stack.push(node);

            node.element.querySelector('.node').classList.add('processing');
            if (onStep) onStep({
                stack: stack.map(n => n.label),
                order: order.map(n => n.label),
                currentNode: node.label
            });

            await new Promise(r => setTimeout(r, 800));
            await this.waitIfPaused(controller);
            if (controller.aborted) return;

            node.element.querySelector('.node').classList.remove('processing');
            node.element.querySelector('.node').classList.add('visited');

            const neighbors = this.graph.getGraphData().adjList.get(node.id);
            for (const neighbor of neighbors) {
                await this.waitIfPaused(controller);
                if (controller.aborted) return;
                if (!visited.has(neighbor.id)) {
                    const neighborNode = this.graph.nodes.get(neighbor.id);

                    const edge = this.graph.edges.find(e =>
                        (e.source === node && e.target === neighborNode) ||
                        (!e.isDirected && e.source === neighborNode && e.target === node)
                    );
                    if (edge) edge.element.classList.add('traversed');

                    await dfs(neighborNode);

                    if (controller.aborted) return;
                }
            }
            stack.pop();
            if (onStep) onStep({
                stack: stack.map(n => n.label),
                order: order.map(n => n.label),
                currentNode: stack.length > 0 ? stack[stack.length - 1].label : null
            });
            await new Promise(r => setTimeout(r, 400));
        };

        await dfs(startNode);
        this.graph.algoController = null;
    }

    async runCustomTraversal(sequenceIds, onStep) {
        this.graph.clearHighlights();
        if (sequenceIds.length === 0) return;

        const controller = { aborted: false, paused: false };
        this.graph.algoController = controller;

        const order = [];
        const visitedNodes = new Set();

        for (let i = 0; i < sequenceIds.length; i++) {
            await this.waitIfPaused(controller);
            if (controller.aborted) break;

            const nodeId = sequenceIds[i];
            const node = this.graph.nodes.get(nodeId);
            if (!node) continue;

            node.element.querySelector('.node').classList.add('processing');
            order.push(node);

            if (onStep) onStep({
                order: order.map(n => n.label),
                currentNode: node.label
            });

            await new Promise(r => setTimeout(r, 600));
            await this.waitIfPaused(controller);
            if (controller.aborted) break;

            node.element.querySelector('.node').classList.remove('processing');
            node.element.querySelector('.node').classList.add('visited');
            visitedNodes.add(nodeId);

            if (i > 0) {
                const prevNodeId = sequenceIds[i - 1];
                const prevNode = this.graph.nodes.get(prevNodeId);
                const edge = this.graph.edges.find(e =>
                    (e.source.id === prevNodeId && e.target.id === nodeId) ||
                    (!e.isDirected && e.source.id === nodeId && e.target.id === prevNodeId)
                );
                if (edge) edge.element.classList.add('traversed');
            }

            if (onStep) onStep({
                order: order.map(n => n.label),
                currentNode: node.label
            });

            await new Promise(r => setTimeout(r, 400));
        }

        const analysis = this.analyzePath(sequenceIds);
        if (onStep) onStep({
            order: order.map(n => n.label),
            currentNode: null,
            analysis: analysis
        });

        this.graph.algoController = null;
    }

    analyzePath(sequenceIds) {
        if (sequenceIds.length === 0) return null;

        const { nodes, edges, adjList } = this.graph.getGraphData();
        const nodeSet = new Set(nodes.map(n => n.id));
        const edgeSet = new Set();

        const getEdgeKey = (u, v, directed) => {
            if (directed) return `${u}->${v}`;
            return [u, v].sort().join('--');
        };

        const pathEdges = [];
        let isValidPath = true;

        for (let i = 0; i < sequenceIds.length - 1; i++) {
            const u = sequenceIds[i];
            const v = sequenceIds[i + 1];
            const edge = this.graph.edges.find(e => (e.source.id === u && e.target.id === v) || (!e.isDirected && e.source.id === v && e.target.id === u));
            if (!edge) {
                isValidPath = false;
                break;
            }
            pathEdges.push(edge);
        }

        if (!isValidPath) return null;

        const allEdgesKeys = new Set();
        this.graph.edges.forEach(e => {
            allEdgesKeys.add(getEdgeKey(e.source.id, e.target.id, e.isDirected));
        });

        const usedEdgesKeys = new Set();
        pathEdges.forEach(e => {
            usedEdgesKeys.add(getEdgeKey(e.source.id, e.target.id, e.isDirected));
        });

        const visitedNodes = new Set(sequenceIds);
        const isEulerPath = usedEdgesKeys.size === allEdgesKeys.size && pathEdges.length === this.graph.edges.length;
        const isEulerCircuit = isEulerPath && sequenceIds[0] === sequenceIds[sequenceIds.length - 1];

        const isHamiltonianPath = visitedNodes.size === nodes.length && sequenceIds.length === nodes.length;
        const isHamiltonianCircuit = visitedNodes.size === nodes.length && sequenceIds.length === nodes.length + 1 && sequenceIds[0] === sequenceIds[sequenceIds.length - 1];

        if (isEulerPath || isEulerCircuit || isHamiltonianPath || isHamiltonianCircuit) {
            return {
                isEulerPath,
                isEulerCircuit,
                isHamiltonianPath,
                isHamiltonianCircuit
            };
        }

        return null;
    }
}
