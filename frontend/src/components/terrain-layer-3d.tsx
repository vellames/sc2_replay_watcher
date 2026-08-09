"use client";

import { useEffect, useRef } from "react";

import { createIsometricProjection, decodeMapRle, type MapBounds, type MapGeometry } from "@/lib/map-projection";

export function TerrainLayer3D({ geometry, bounds }: { geometry: MapGeometry; bounds: MapBounds }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const mapWidth = geometry.width ?? 0;
    const mapHeight = geometry.height ?? 0;
    if (!canvas || !mapWidth || !mapHeight) return;
    canvas.width = 1000;
    canvas.height = 1000;
    const context = canvas.getContext("2d");
    if (!context) return;
    const projection = createIsometricProjection(geometry, bounds);
    const walkable = decodeMapRle(geometry.walkableRle, mapWidth * mapHeight);
    const scalePoint = (point: { left: number; bottom: number }) => ({ x: point.left * 10, y: (100 - point.bottom) * 10 });
    const isWalkable = (x: number, y: number) => {
      const column = Math.max(0, Math.min(mapWidth - 1, Math.floor(x)));
      const row = Math.max(0, Math.min(mapHeight - 1, Math.floor(y)));
      return walkable[row * mapWidth + column] === 1;
    };
    const step = Math.max(2, Math.ceil(Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 96));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineJoin = "round";

    for (let sum = bounds.minX + bounds.minY; sum <= bounds.maxX + bounds.maxY; sum += step) {
      for (let x = bounds.minX; x <= bounds.maxX; x += step) {
        const y = sum - x;
        if (y < bounds.minY || y > bounds.maxY) continue;
        const nextX = Math.min(bounds.maxX, x + step);
        const nextY = Math.min(bounds.maxY, y + step);
        const level = projection.sampleLevel(x + step / 2, y + step / 2);
        const corners = [
          projection.project(x, y, level), projection.project(nextX, y, level),
          projection.project(nextX, nextY, level), projection.project(x, nextY, level),
        ].map(scalePoint);
        const accessible = isWalkable(x + step / 2, y + step / 2);
        context.beginPath();
        context.moveTo(corners[0].x, corners[0].y);
        for (const point of corners.slice(1)) context.lineTo(point.x, point.y);
        context.closePath();
        context.fillStyle = accessible ? "rgba(48, 128, 157, .055)" : "rgba(17, 42, 56, .035)";
        context.fill();
        context.strokeStyle = accessible ? "rgba(83, 151, 176, .055)" : "rgba(43, 76, 91, .035)";
        context.lineWidth = .7;
        context.stroke();

        const eastLevel = projection.sampleLevel(nextX + .1, y + step / 2);
        const northLevel = projection.sampleLevel(x + step / 2, nextY + .1);
        for (const [neighborLevel, startIndex, endIndex] of [[eastLevel, 1, 2], [northLevel, 2, 3]] as const) {
          if (neighborLevel >= level) continue;
          const drop = Math.max(3, (level - neighborLevel) * 10);
          const start = corners[startIndex];
          const end = corners[endIndex];
          context.beginPath();
          context.moveTo(start.x, start.y);
          context.lineTo(end.x, end.y);
          context.lineTo(end.x, end.y + drop);
          context.lineTo(start.x, start.y + drop);
          context.closePath();
          context.fillStyle = "rgba(45, 103, 127, .15)";
          context.fill();
          context.strokeStyle = "rgba(91, 167, 194, .18)";
          context.stroke();
        }
      }
    }

    const outline = [
      projection.project(bounds.minX, bounds.minY), projection.project(bounds.maxX, bounds.minY),
      projection.project(bounds.maxX, bounds.maxY), projection.project(bounds.minX, bounds.maxY),
    ].map(scalePoint);
    context.beginPath();
    context.moveTo(outline[0].x, outline[0].y);
    for (const point of outline.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    context.strokeStyle = "rgba(103, 190, 220, .34)";
    context.lineWidth = 1.5;
    context.stroke();
  }, [geometry, bounds]);

  return <canvas ref={canvasRef} className="terrain-layer terrain-layer-3d" aria-hidden="true" />;
}
