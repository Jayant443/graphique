class GraphAlgorithms {
    constructor(graph) {
        this.graph = graph;
    }

    async runBFS(startNodeId, onStep) {
        this.graph.clearHighlights();
        const startNode = this.graph.nodes.get(startNodeId);
        if (!startNode) return;

        const controller = { aborted: false };
        this.graph.algoController = controller;

        const queue = [startNode];
        const visited = new Set([startNodeId]);
        const order = [];

        startNode.element.querySelector('.node').classList.add('processing');
        if (onStep) onStep({ queue: queue.map(n => n.label), order: order.map(n => n.label) });

        while (queue.length > 0 && !controller.aborted) {
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
            if (controller.aborted) break;

            const neighbors = this.graph.getGraphData().adjList.get(current.id);
            for (const neighbor of neighbors) {
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

    async runDFS(startNodeId, onStep) {
        this.graph.clearHighlights();
        const startNode = this.graph.nodes.get(startNodeId);
        if (!startNode) return;

        const controller = { aborted: false };
        this.graph.algoController = controller;

        const visited = new Set();
        const order = [];
        const stack = [];

        const dfs = async (node) => {
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
            if (controller.aborted) return;

            node.element.querySelector('.node').classList.remove('processing');
            node.element.querySelector('.node').classList.add('visited');

            const neighbors = this.graph.getGraphData().adjList.get(node.id);
            for (const neighbor of neighbors) {
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
