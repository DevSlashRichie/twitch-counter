"use client";

import { supabase } from "@/utils";
import { useState } from "react";

export default function Edit() {
  const [seconds, setSeconds] = useState<number>();

  const handleAddTime = () => {
    supabase
      .from("stripe-to-update")
      .insert({ timeToUpdateAtDb: seconds })
      .then(() => {
        alert("Se ha agregado el tiempo correctamente");
      });
  };

  const handleRemoveTime = () => {
    supabase
      .from("stripe-to-update")
      .insert({ timeToUpdateAtDb: seconds, operation: "remove" })
      .then(() => {
        alert("Se ha eliminado el tiempo correctamente");
      });
  };

  return (
    <div className="w-[400px] px-5 py-3">
      <div className="flex flex-col gap-2">
        <span className="font-bold text-xl">Segundos: </span>
        <input
          type="number"
          className="border rounded-lg p-2 focus:outline-none focus:border-gray-700 transition"
          value={seconds}
          onChange={(e) => {
            if (e.target.value === "") setSeconds(undefined);
            else setSeconds(Number(e.target.value));
          }}
          placeholder="100"
        />
        <div className="flex gap-2">
          <button
            className="border border-gray-200 rounded-lg py-1 px-2 hover:border-gray-700 transition"
            onClick={handleAddTime}
          >
            Agregar
          </button>
          <button
            className="border border-gray-200 rounded-lg py-1 px-2 hover:border-gray-700 transition"
            onClick={handleRemoveTime}
          >
            Quitar
          </button>
        </div>
      </div>
    </div>
  );
}
