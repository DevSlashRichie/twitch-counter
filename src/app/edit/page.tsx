"use client";
import { supabase } from "@/utils";
import { useState } from "react";

function AddRemoveNumber({
  seconds,
  setSeconds,
  handleAddTime,
  handleRemoveTime,
  label,
}: {
  seconds: number | undefined;
  setSeconds: (value: number | undefined) => void;
  handleAddTime: () => void;
  handleRemoveTime: () => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-bold text-xl">{label}: </span>
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
  );
}

export default function Edit() {
  const [seconds, setSeconds] = useState<number>();
  const [multiplier, setMultiplier] = useState<number>();

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

  const handleAddMultiplier = () => {
    supabase
      .from("multiplier")
      .update({ amount: multiplier })
      .eq("id", 1)
      .then(() => {
        alert("Se ha agregado el tiempo correctamente");
      });
  };

  const handleRemoveMultiplier = () => {
    supabase
      .from("multiplier")
      .update({ amount: multiplier })
      .eq("id", 1)
      .then(() => {
        alert("Se ha eliminado el tiempo correctamente");
      });
  };

  return (
    <div className="w-[400px] px-5 py-3 flex gap-2">
      <AddRemoveNumber
        seconds={seconds}
        setSeconds={setSeconds}
        handleAddTime={handleAddTime}
        handleRemoveTime={handleRemoveTime}
        label="Segundos"
      />

      <AddRemoveNumber
        seconds={multiplier}
        setSeconds={setMultiplier}
        handleAddTime={handleAddMultiplier}
        handleRemoveTime={handleRemoveMultiplier}
        label="Multiplier"
        />
    </div>
  );
}
