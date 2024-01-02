// Helpers
import { getSimklList } from "~/utils/simkl/get";
// Types
import type { RequestHandler } from "@builder.io/qwik-city";
import {
  SimklLibraryObjectStatus,
  SimklLibraryType,
} from "~/utils/simkl/types";
import { convertToCinemeta } from "~/utils/simkl/convert";
import { ReceiverTypes } from "~/utils/connections/types";

export const onGet: RequestHandler = async ({ json, params, env }) => {
  const userConfigString = decodeURI(params.config).split("|");

  const userConfig: Record<string, Record<string, string> | undefined> = {};
  for (let i = 0; i < userConfigString.length; i++) {
    const lineConfig = userConfigString[i].split("-=-");
    const keyConfig = lineConfig[0].split("_");
    userConfig[keyConfig[0]] = {
      ...(userConfig[keyConfig[0]] ? userConfig[keyConfig[0]] : {}),
      [keyConfig[1]]: lineConfig[1],
    };
  }

  const catchall = params.catchall.slice(0, -".json".length).split("/");

  if (!catchall[0] || !catchall[1]) {
    json(200, { metas: [] });
    return;
  }

  catchall[1] = catchall[1].slice("syncribullet-".length);
  const catchallParams = (catchall[2] || "skip=0").split("&");

  let skipCount = 0;
  let genre: string | undefined;

  for (let i = 0; i < catchallParams.length; i++) {
    let item = catchallParams[i].split("=");
    if (item[0] === "skip") {
      skipCount = parseInt(item[1]);
    } else if (item[0] === "genre") {
      genre = item[1];
    }
  }

  const catalogInfo: [
    ReceiverTypes,
    SimklLibraryType,
    SimklLibraryObjectStatus,
  ] = catchall[1].split("-") as [
    ReceiverTypes,
    SimklLibraryType,
    SimklLibraryObjectStatus,
  ];

  if (catalogInfo[0] === "simkl") {
    if (userConfig["simkl"] && !userConfig["simkl"].clientid) {
      userConfig["simkl"].clientid = env.get("PRIVATE_SIMKL_CLIENT_ID") || "";
    }

    const list = await getSimklList(
      catalogInfo[1],
      catalogInfo[2],
      userConfig["simkl"],
    );

    const metas = await convertToCinemeta(catalogInfo[1], list, {
      skip: skipCount,
      genre: genre,
    });
    json(200, { metas: metas });
    return;
  }

  json(200, { metas: [] });
};