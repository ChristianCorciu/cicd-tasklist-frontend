// À placer dans : src/__tests__/useTasks.test.ts (frontend)
//
// Ces tests mockent le module taskApi pour ne pas dépendre d'un vrai serveur backend.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTasks } from "../hooks/useTasks";
import * as taskApi from "../api/taskApi";
import type { Task } from "../types/task";

vi.mock("../api/taskApi");

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: "Tâche test",
  description: null,
  completed: false,
  createdAt: "2026-07-02T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z",
  ...overrides,
});

describe("useTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("charge les tâches au montage et met loading à false ensuite", async () => {
    const fakeTasks = [makeTask({ id: 1 }), makeTask({ id: 2 })];
    vi.mocked(taskApi.getTasks).mockResolvedValue(fakeTasks);

    const { result } = renderHook(() => useTasks());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(taskApi.getTasks).toHaveBeenCalledTimes(1);
    expect(result.current.tasks).toEqual(fakeTasks);
    expect(result.current.error).toBeNull();
  });

  it("expose un message d'erreur si le chargement échoue", async () => {
    vi.mocked(taskApi.getTasks).mockRejectedValue(new Error("Erreur réseau"));

    const { result } = renderHook(() => useTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Erreur réseau");
    expect(result.current.tasks).toEqual([]);
  });

  it("ajoute une nouvelle tâche en tête de liste", async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue([]);
    const newTask = makeTask({ id: 5, title: "Nouvelle tâche" });
    vi.mocked(taskApi.createTask).mockResolvedValue(newTask);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTask({ title: "Nouvelle tâche" });
    });

    expect(taskApi.createTask).toHaveBeenCalledWith({ title: "Nouvelle tâche" });
    expect(result.current.tasks[0]).toEqual(newTask);
  });

  it("met à jour une tâche existante", async () => {
    const initial = makeTask({ id: 1, title: "Ancien titre" });
    vi.mocked(taskApi.getTasks).mockResolvedValue([initial]);
    const updated = { ...initial, title: "Nouveau titre" };
    vi.mocked(taskApi.updateTask).mockResolvedValue(updated);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.editTask(1, { title: "Nouveau titre" });
    });

    expect(result.current.tasks[0].title).toBe("Nouveau titre");
  });

  it("supprime une tâche de la liste", async () => {
    const task = makeTask({ id: 1 });
    vi.mocked(taskApi.getTasks).mockResolvedValue([task]);
    vi.mocked(taskApi.deleteTask).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeTask(1);
    });

    expect(taskApi.deleteTask).toHaveBeenCalledWith(1);
    expect(result.current.tasks).toHaveLength(0);
  });

  it("bascule l'état 'completed' d'une tâche", async () => {
    const task = makeTask({ id: 1, completed: false });
    vi.mocked(taskApi.getTasks).mockResolvedValue([task]);
    const toggled = { ...task, completed: true };
    vi.mocked(taskApi.updateTask).mockResolvedValue(toggled);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleComplete(1);
    });

    expect(taskApi.updateTask).toHaveBeenCalledWith(1, { completed: true });
    expect(result.current.tasks[0].completed).toBe(true);
  });

  it("ne fait rien si on tente de basculer une tâche inexistante", async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleComplete(999);
    });

    expect(taskApi.updateTask).not.toHaveBeenCalled();
  });
});
