"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";
import axios from "axios";
import { supabase } from "@/utils";
import { useSearchParams } from "next/navigation";

const REWARDS_DICT_SECONDS = {
  cheer: 2.4,
  follow: 30,
  "subscribe.0": 300,
  "subscribe.1": 300,
  "subscribe.2": 600,
  "subscribe.3": 900,
} as Record<string, number>;

function createNiceTimer(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function processCheerEvent(cheerAmount: number): number {
  const reward = REWARDS_DICT_SECONDS["cheer"];
  return cheerAmount * reward;
}

function processFollowEvent(): number {
  return REWARDS_DICT_SECONDS["follow"];
}

function processSubscribeEvent(subTier: number, amount = 1): number {
  return REWARDS_DICT_SECONDS[`subscribe.${subTier}`] * amount;
}

function normalizeTier(tier: string): number {
  return Number(tier) / 1000 || 1;
}

const updateDb = async (time: number) => {
  const firstRecord = await supabase.from("time").select();

  if (!firstRecord.data?.length) {
    void supabase.from("time").insert({ time }).then();
  } else {
    void supabase
      .from("time")
      .update({ time })
      .eq("id", firstRecord.data[0].id)
      .then();
  }
};

export function Counter() {
  const [multiplier, setMultiplier] = useState<number>(1);
  const [time, setTimer] = useState<number | null>(0);

  const preventOverLoad = useRef<number>(2);

  const query = useSearchParams();

  const isProd = query.get("prod") === "true";

  const {} = useWebSocket(
    isProd
      ? "wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=60"
      : "ws://127.0.0.1:8080/ws",
    {
      share: true,
      onMessage: (event) => {
        const data = JSON.parse(event.data);
        console.log(data);

        if (data.metadata.message_type === "session_welcome") {
          void Promise.all(
            [
              "channel.subscribe",
              "channel.subscription.gift",
              "channel.subscription.message",
              "channel.cheer",
            ].map(async (type) => {
              axios.post(
                isProd
                  ? "https://api.twitch.tv/helix/eventsub/subscriptions"
                  : "http://localhost:8080/eventsub/subscriptions",
                {
                  //type: "channel.subscribe channel.subscription.gift channel.subscription.message channel.cheer",
                  type,
                  version: "1",
                  condition: {
                    broadcaster_user_id: process.env.NEXT_PUBLIC_TWITCH_USER_ID,
                  },
                  transport: {
                    method: "websocket",
                    session_id: data.payload.session.id,
                  },
                },
                {
                  headers: {
                    Authorization: `Bearer ${query.get("token")}`,
                    "Client-Id": query.get("client_id"),
                    "Content-Type": "application/json",
                  },
                },
              );
            }),
          ).then();
        } else if (data.metadata.message_type === "notification") {
          switch (data.metadata.subscription_type) {
            case "channel.cheer":
              const cheerAmount = data.payload.event.bits as number;
              const reward = processCheerEvent(cheerAmount);
              handleAddTime(reward);
              break;

            case "channel.follow":
              const rewardFollow = processFollowEvent();
              handleAddTime(rewardFollow);
              break;

            case "channel.subscribe":
              if (data.payload.event.is_gift) {
                return;
              }

              const tier = data.payload.event.tier as string;

              const normalized = normalizeTier(tier);

              const rewardSubscribe = processSubscribeEvent(normalized);
              handleAddTime(rewardSubscribe);
              break;
            case "channel.subscription.gift":
              const amount = data.payload.event.total as number;
              const normalizedTier = normalizeTier(
                data.payload.event.tier as string,
              );

              const rewardSubscribeGift = processSubscribeEvent(
                normalizedTier,
                amount,
              );
              handleAddTime(rewardSubscribeGift);
              break;
            case "channel.subscription.message":
              const normalizedTierMessage = normalizeTier(
                data.payload.event.tier as string,
              );

              const rewardSubscribeMessage = processSubscribeEvent(
                normalizedTierMessage,
              );
              handleAddTime(rewardSubscribeMessage);
              break;
          }
        }
      },
    },
  );

  useEffect(() => {
    supabase
      .from("time")
      .select()
      .then(({ data }) => {
        if (data)
          setTimer(() => {
            return data[0].time;
          });
      });
  }, []);

  const updateCache = (time: number) => {
    if (
      typeof time !== "number" ||
      time % 5 !== 0 ||
      preventOverLoad.current !== 0
    )
      return;

    void updateDb(time).then();

    preventOverLoad.current = 2;
  };

  useEffect(() => {
    if (!time) {
      if (time === 0) updateCache(time);
      return;
    }

    const timer = setInterval(() => {
      setTimer((prev) => {
        const newTime = (prev || 0) - 1;
        updateCache(newTime);
        return newTime;
      });

      preventOverLoad.current = Math.max(0, preventOverLoad.current - 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [time]);

  const handleAddTime = useCallback(
    (seconds: number) => {
      setTimer((prev) => {
        const isNegative = seconds < 0;
        const n = Math.max(
          0,
          (prev ?? 0) + seconds * (isNegative ? 1 : multiplier),
        );
        void updateDb(n).then();
        return n;
      });
    },
    [multiplier],
  );

  useEffect(() => {
    // listen for db updates

    const u = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
        },
        (payload) => {
          if (payload.table === "stripe-to-update") {
            if (payload.new.operation === "remove") {
              handleAddTime(-payload.new.timeToUpdateAtDb);
              return;
            } else {
              handleAddTime(payload.new.timeToUpdateAtDb);
            }
          }
        },
      )
      .subscribe();

    return () => {
      u.unsubscribe();
    };
  }, [handleAddTime]);

  return (
    <main>
      <h1 className="text-8xl text-white">
        {typeof time === "number" && createNiceTimer(time)}
        {time === null && "Cargando..."}
      </h1>
    </main>
  );
}
