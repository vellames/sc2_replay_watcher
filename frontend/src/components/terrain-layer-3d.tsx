"use client";

import { useEffect, useRef } from "react";

import { createIsometricProjection, decodeMapRle, projectedHeading, type MapBounds, type MapGeometry } from "@/lib/map-projection";

export function TerrainLayer3D({ geometry, bounds, rotation = 0 }: { geometry: MapGeometry; bounds: MapBounds; rotation?: number }) {
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
    const projection = createIsometricProjection(geometry, bounds, rotation);
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

    const cells: Array<{ x: number; y: number; nextX: number; nextY: number; level: number; depth: number; accessible: boolean }> = [];
    for (let y = bounds.minY; y < bounds.maxY; y += step) {
      for (let x = bounds.minX; x < bounds.maxX; x += step) {
        const nextX = Math.min(bounds.maxX, x + step);
        const nextY = Math.min(bounds.maxY, y + step);
        const centerX = (x + nextX) / 2;
        const centerY = (y + nextY) / 2;
        const level = projection.sampleLevel(centerX, centerY);
        cells.push({ x, y, nextX, nextY, level, depth: projection.project(centerX, centerY, level).bottom, accessible: isWalkable(centerX, centerY) });
      }
    }
    cells.sort((left, right) => right.depth - left.depth);

    for (const cell of cells) {
      const corners = [
        projection.project(cell.x, cell.y, cell.level), projection.project(cell.nextX, cell.y, cell.level),
        projection.project(cell.nextX, cell.nextY, cell.level), projection.project(cell.x, cell.nextY, cell.level),
      ].map(scalePoint);
      context.beginPath();
      context.moveTo(corners[0].x, corners[0].y);
      for (const point of corners.slice(1)) context.lineTo(point.x, point.y);
      context.closePath();
      context.fillStyle = cell.accessible ? "rgba(48, 128, 157, .055)" : "rgba(17, 42, 56, .035)";
      context.fill();
      context.strokeStyle = cell.accessible ? "rgba(83, 151, 176, .055)" : "rgba(43, 76, 91, .035)";
      context.lineWidth = .7;
      context.stroke();

      const eastLevel = projection.sampleLevel(cell.nextX + .1, (cell.y + cell.nextY) / 2);
      const northLevel = projection.sampleLevel((cell.x + cell.nextX) / 2, cell.nextY + .1);
      for (const [neighborLevel, startIndex, endIndex] of [[eastLevel, 1, 2], [northLevel, 2, 3]] as const) {
        if (neighborLevel >= cell.level) continue;
        const drop = Math.max(3, (cell.level - neighborLevel) * 10);
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

    for (const ramp of geometry.ramps) {
      const point = scalePoint(projection.project(ramp.x, ramp.y));
      const angle = projectedHeading(projection.project, ramp.x, ramp.y, ramp.direction * 45) * Math.PI / 180;
      context.save();
      context.translate(point.x, point.y);
      context.rotate(angle);
      context.strokeStyle = "rgba(116, 218, 241, .38)";
      context.lineWidth = 1.4;
      for (const offset of [-7, 0, 7]) {
        context.beginPath();
        context.moveTo(offset - 4, -3);
        context.lineTo(offset, 0);
        context.lineTo(offset - 4, 3);
        context.stroke();
      }
      context.restore();
    }

    for (const item of geometry.staticObjects) {
      const point = scalePoint(projection.project(item.x, item.y));
      context.strokeStyle = "rgba(205, 169, 116, .1)";
      context.lineWidth = .8;
      context.beginPath();
      context.ellipse(point.x, point.y, 3.5, 1.8, 0, 0, Math.PI * 2);
      context.moveTo(point.x - 2, point.y);
      context.lineTo(point.x - 2, point.y - 5);
      context.lineTo(point.x + 2, point.y - 5);
      context.lineTo(point.x + 2, point.y);
      context.stroke();
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
  }, [geometry, bounds, rotation]);

  return <canvas ref={canvasRef} className="terrain-layer terrain-layer-3d" aria-hidden="true" />;
}
