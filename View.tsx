import React, { useCallback, useEffect, useState } from "react";
import Scene from "./scene";

let frameRequest = 0;

const ReactView: React.FC = () => {
  const [canvas, setCanvas] = useState<HTMLCanvasElement>();
  const [scene, setScene] = useState<Scene>();
  // const [thingThatExtendsChild, setThingThatExtendsChild] = useState<ThingThatExtendsCHild>();
  const [rsob, setRsob] = useState<ResizeObserver>();

  const handleCanvasMounted = useCallback(
    (node: HTMLCanvasElement | undefined) => {
      if (node && node.parentElement) {
        node.height = node.parentElement.clientHeight;
        node.width = node.parentElement.clientWidth;
        const scene = new Scene(node);

        // let thingThatExtendsChild = new ThingThatExtendsChild()
        // scene.children.push(thingThatExtendsChild);

        setScene(scene);
        // setThingThatExtendsChild(cloud);
        setCanvas(node);
      }
    },
    [],
  );

  const handleCanvasParentMounted = useCallback(
    (node: HTMLDivElement | undefined) => {
      if (node && canvas && scene && !rsob) {
        const rsob = new ResizeObserver(() => {
          if (canvas.parentElement) {
            canvas.height = canvas.parentElement?.clientHeight;
            canvas.width = canvas.parentElement?.clientWidth;
          }
          scene?.resize();
        });
        rsob.observe(node);
        setRsob(rsob);
      }
    },
    [canvas, scene],
  );

  useEffect(() => {
    if (scene && canvas) {
      const animate = (t: number) => {
        scene.render(t);
        frameRequest = window.requestAnimationFrame(animate);
      };

      window.requestAnimationFrame(animate);

      return () => {
        window.cancelAnimationFrame(frameRequest);
      };
    }
  }, [scene, canvas]);

  return (
    <div className="flex h-full w-full flex-col p-4">
      <div
        className="relative shrink-0 grow overflow-hidden rounded-md border border-gray-800"
        ref={handleCanvasParentMounted as any}
      >
        <canvas ref={handleCanvasMounted as any}></canvas>

        <div
          id="tooltip"
          className="border-1 pointer-events-none absolute hidden rounded-sm border bg-black px-2 py-1 text-xs text-white break-word"
        />
      </div>
    </div>
  );
};

export default ReactView;
