import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useBoard = () => {
  return useQuery({
    queryKey: ["board"],
    queryFn: api.getBoard,
  });
};