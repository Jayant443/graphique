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
            const queue = indexToNode
                .filter((node, i) => !visited[i] && dist[i] !== Infinity)
                .map(node => node.label);
            
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
}
