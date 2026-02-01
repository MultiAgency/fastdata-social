import { useState, useCallback, useRef, useEffect } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import { fetchConnections } from "../hooks/kvApi";
import { Button } from "@/components/ui/button";

interface GraphViewProps {
  accountId: string;
}

interface GraphNode {
  id: string;
  color: string;
  val: number;
}

interface GraphLink {
  source: string;
  target: string;
  color: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const NODE_CAP = 200;
const ROOT_COLOR = "#f59e0b";
const NODE_COLOR = "#00ff87";
const FOLLOWING_EDGE_COLOR = "#00ff87";
const FOLLOWER_EDGE_COLOR = "#f59e0b";
const BG_COLOR = "#0a0e1a";

function GraphViewInner({ accountId }: GraphViewProps) {
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef(new Set<string>());
  const nodeIdsRef = useRef(new Set<string>());
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDimensions({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const expandNode = useCallback(
    async (nodeId: string) => {
      if (expandedRef.current.has(nodeId)) return;
      if (nodeIdsRef.current.size > NODE_CAP) return;

      setLoading(true);
      try {
        const { following, followers } = await fetchConnections(nodeId);
        expandedRef.current.add(nodeId);

        setGraphData((prev) => {
          const newNodes = [...prev.nodes];
          const newLinks = [...prev.links];

          if (!nodeIdsRef.current.has(nodeId)) {
            newNodes.push({
              id: nodeId,
              color: nodeId === accountId ? ROOT_COLOR : NODE_COLOR,
              val: nodeId === accountId ? 8 : 2,
            });
            nodeIdsRef.current.add(nodeId);
          }

          for (const f of following) {
            if (!nodeIdsRef.current.has(f)) {
              newNodes.push({ id: f, color: NODE_COLOR, val: 2 });
              nodeIdsRef.current.add(f);
            }
            newLinks.push({ source: nodeId, target: f, color: FOLLOWING_EDGE_COLOR });
          }

          for (const f of followers) {
            if (!nodeIdsRef.current.has(f)) {
              newNodes.push({ id: f, color: NODE_COLOR, val: 2 });
              nodeIdsRef.current.add(f);
            }
            newLinks.push({ source: f, target: nodeId, color: FOLLOWER_EDGE_COLOR });
          }

          return { nodes: newNodes, links: newLinks };
        });

        setTimeout(() => fgRef.current?.zoomToFit(400), 300);
      } catch (err) {
        console.error("Failed to expand node:", err);
      } finally {
        setLoading(false);
      }
    },
    [accountId]
  );

  useEffect(() => {
    expandNode(accountId);
  }, [accountId, expandNode]);

  const handleNodeClick = useCallback(
    (node: object) => {
      expandNode((node as GraphNode).id);
    },
    [expandNode]
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={BG_COLOR}
        nodeColor={(node: object) => (node as GraphNode).color}
        nodeVal={(node: object) => (node as GraphNode).val}
        nodeLabel="id"
        linkColor={(link: object) => (link as GraphLink).color}
        linkWidth={1}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(link: object) => (link as GraphLink).color}
        onNodeClick={handleNodeClick}
        showNavInfo={false}
      />

      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg border border-border text-xs font-mono z-10">
        <div className="text-muted-foreground">nodes: <span className="text-foreground">{graphData.nodes.length}</span></div>
        <div className="text-muted-foreground">expanded: <span className="text-foreground">{expandedRef.current.size}</span></div>
        {loading && <div className="text-accent mt-1">loading_</div>}
        {graphData.nodes.length >= NODE_CAP && <div className="text-destructive mt-1">cap reached</div>}
      </div>

      <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm p-2 rounded-lg border border-border text-xs font-mono text-muted-foreground z-10">
        click node to expand
      </div>
    </div>
  );
}

export function GraphView({ accountId }: GraphViewProps) {
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-border mt-2 animate-fade-up">
      <GraphViewInner key={resetKey} accountId={accountId} />

      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setResetKey((k) => k + 1)}
          className="font-mono text-xs border border-border bg-background/90 backdrop-blur-sm"
        >
          reset_
        </Button>
      </div>

      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg border border-border text-xs font-mono z-10">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span className="text-muted-foreground">root / followers</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
          <span className="text-muted-foreground">following</span>
        </div>
      </div>
    </div>
  );
}
