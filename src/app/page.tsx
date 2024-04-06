import { Suspense } from "react";
import { Counter } from "./compo";

export default function Home() {
  return (
    <div>
      <Suspense>
        <Counter />
      </Suspense>
    </div>
  );
}

