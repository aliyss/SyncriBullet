import {
  $,
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from '@builder.io/qwik';
import { useLocation, useNavigate } from '@builder.io/qwik-city';
import type { DocumentHead } from '@builder.io/qwik-city';

// Components
import { Button } from '~/components/buttons/Button';
import AnilistLogin from '~/components/forms/anilist-login';
import ManifestSettings from '~/components/forms/manifest-settings';
import SimklLogin from '~/components/forms/simkl-login';
import StremioLogin from '~/components/forms/stremio-login';

// Utils
import { configureReceivers, receivers } from '~/utils/connections/receivers';
// Types
import type { ReceiverConfig } from '~/utils/connections/receivers';

import { getAnilistCatalogs } from '~/utils/anilist/helper';
import type { ReceiverSettings } from '~/utils/settings/stringify';
import { stringifySettings } from '~/utils/settings/stringify';
import { getSimklCatalogs } from '~/utils/simkl/helper';

export type ApiClientForm = {
  client_id: string;
};

export type ManifestSettingsForm = {
  catalogs: IManifestSettings['catalogs'];
};

export type ApiClientCodeForm = {
  user_code: string;
};

export interface IManifestSettings extends ReceiverSettings {
  catalogs: { id: string; name: string; value: boolean }[];
}

export interface ManifestSettingsInfo {
  catalogs: { id: string; name: string }[];
}

export interface CurrentReceiver {
  id: string;
  settings?: {
    info: ManifestSettingsInfo;
    data: IManifestSettings;
  };
}

export default component$(() => {
  const nav = useNavigate();
  const location = useLocation();
  const senderListSync = [
    {
      id: 'stremio',
      icon: 'https://www.stremio.com/website/stremio-logo-small.png',
      text: 'Stremio',
      backgroundColour: 'bg-[#8152A3]/60',
    },
  ];

  const configuredReceivers = useStore<Record<string, ReceiverConfig>>(
    configureReceivers(),
  );
  const currentReceiver = useSignal<CurrentReceiver | null>(null);

  useVisibleTask$(() => {
    const configInfo = window.location.search.split('config=')[1];
    if (configInfo) {
      const configInfoData = configInfo.split('|');
      for (let i = 0; i < configInfoData.length; i++) {
        const dataReceiver = configInfoData[i].split('-=-');
        if (!dataReceiver[1]) {
          continue;
        }
        const receiverName = dataReceiver[0].split('_');
        if (receiverName[0] === 'anilist') {
          if (receiverName[1] === 'accesstoken') {
            window.localStorage.setItem(
              'anilist',
              JSON.stringify({ access_token: dataReceiver[1] }),
            );
          }
        } else if (receiverName[0] === 'simkl') {
          let simklData = {};
          const simkl = window.localStorage.getItem('simkl');
          if (simkl) {
            simklData = JSON.parse(simkl);
          }
          if (receiverName[1] === 'accesstoken') {
            window.localStorage.setItem(
              'simkl',
              JSON.stringify({
                result: 'OK',
                access_token: dataReceiver[1],
                ...simklData,
              }),
            );
          } else if (receiverName[1] === 'clientid') {
            window.localStorage.setItem(
              'simkl',
              JSON.stringify({
                result: 'OK',
                client_id: dataReceiver[1],
                ...simklData,
              }),
            );
          }
        } else if (receiverName[0] === 'stremio') {
          let stremioData = {};
          const stremio = window.localStorage.getItem('stremio');
          if (stremio) {
            stremioData = JSON.parse(stremio);
          }
          if (receiverName[1] === 'authKey') {
            window.localStorage.setItem(
              'stremio',
              JSON.stringify({
                result: 'OK',
                authKey: dataReceiver[1],
                ...stremioData,
              }),
            );
          }
        } else if (receiverName[0] === 'trakt') {
          let simklData = {};
          const simkl = window.localStorage.getItem('trakt');
          if (simkl) {
            simklData = JSON.parse(simkl);
          }
          if (receiverName[1] === 'accesstoken') {
            window.localStorage.setItem(
              'trakt',
              JSON.stringify({
                access_token: dataReceiver[1],
                ...simklData,
              }),
            );
          } else if (receiverName[1] === 'clientid') {
            window.localStorage.setItem(
              'trakt',
              JSON.stringify({
                client_id: dataReceiver[1],
                ...simklData,
              }),
            );
          }
        }
      }
    }

    const anilist = window.localStorage.getItem('anilist');
    if (anilist) {
      configuredReceivers['anilist'].enabled = true;
      configuredReceivers['anilist'].data = JSON.parse(anilist);
    }
    const simkl = window.localStorage.getItem('simkl');
    if (simkl) {
      configuredReceivers['simkl'].enabled = true;
      configuredReceivers['simkl'].data = JSON.parse(simkl);
    }
    const stremio = window.localStorage.getItem('stremio');
    if (stremio) {
      configuredReceivers['stremio'].enabled = true;
      configuredReceivers['stremio'].data = JSON.parse(stremio);
    }
  });

  const getLocalSettings = $(async (id: string) => {
    const localSettings = window.localStorage.getItem(`${id}-settings`);
    const catalogs = [];
    if (id === 'anilist') {
      catalogs.push(...getAnilistCatalogs());
    } else if (id === 'simkl') {
      catalogs.push(...getSimklCatalogs());
    }
    if (localSettings) {
      return {
        data: JSON.parse(localSettings) as IManifestSettings,
        info: {
          catalogs: catalogs.map((item) => {
            return {
              id: item.id,
              name: item.name,
            };
          }),
        },
      };
    }
    return {
      data: {
        catalogs: catalogs.map((item) => {
          return {
            id: item.id,
            name: item.name,
            value: true,
          };
        }),
      } as IManifestSettings,
      info: {
        catalogs: catalogs.map((item) => {
          return {
            id: item.id,
            name: item.name,
          };
        }),
      },
    };
  });

  const liveSyncItems = receivers
    .filter((item) => item.liveSync)
    .map((item) => {
      return (
        <Button
          key={item.id}
          backgroundColour={item.backgroundColour}
          icon={
            configuredReceivers[item.id].enabled
              ? 'https://api.iconify.design/tabler:checks.svg?color=%237FFD4F'
              : item.icon
          }
          onClick$={async () => {
            const catalogs = await getLocalSettings(item.id);
            currentReceiver.value = {
              id: item.id,
              settings: {
                data: catalogs.data,
                info: catalogs.info,
              },
            };
          }}
        >
          {item.text}
        </Button>
      );
    });

  const removeAuthentication = $((name?: string | null) => {
    if (name) {
      configuredReceivers[name].enabled = false;
      configuredReceivers[name].data = undefined;
      window.localStorage.removeItem(name);
    }
    if (name === 'simkl') {
      window.localStorage.removeItem(name + '_code');
    }
  });

  /*
  const fullSyncItems = receiverListSync
    .filter((item) => item.fullSync)
    .map((item) => {
      return (
        <Button
          key={item.id}
          backgroundColour={item.backgroundColour}
          icon={item.icon}
        >
          {item.text}
        </Button>
      );
    });
  */

  const syncApplications = senderListSync.map((item) => {
    return (
      <Button
        key={item.id}
        backgroundColour={item.backgroundColour}
        icon={item.icon}
        onClick$={() => {
          const configURL: string[] = [];
          if (configuredReceivers['anilist'].data) {
            configURL.push(
              `anilist_accesstoken-=-${configuredReceivers['anilist'].data.access_token}`,
            );
            const anilistSettings =
              window.localStorage.getItem('anilist-settings');
            if (anilistSettings) {
              try {
                const anilistSettingsData: IManifestSettings =
                  JSON.parse(anilistSettings);
                configURL.push(
                  `anilist_settings-=-${stringifySettings(
                    anilistSettingsData,
                    'anilist',
                  )}`,
                );
              } catch (e) {
                console.error(e);
              }
            }
          }
          if (configuredReceivers['simkl'].data) {
            configURL.push(
              `simkl_accesstoken-=-${configuredReceivers['simkl'].data.access_token}`,
            );
            configURL.push(
              `simkl_clientid-=-${configuredReceivers['simkl'].data.client_id}`,
            );

            const simklSettings = window.localStorage.getItem('simkl-settings');
            if (simklSettings) {
              try {
                const simklSettingsData: IManifestSettings =
                  JSON.parse(simklSettings);
                configURL.push(
                  `simkl_settings-=-${stringifySettings(
                    simklSettingsData,
                    'simkl',
                  )}`,
                );
              } catch (e) {
                console.error(e);
              }
            }
          }
          if (configuredReceivers['stremio'].data) {
            configURL.push(
              `stremio_authKey-=-${configuredReceivers['stremio'].data.authKey}`,
            );
          }
          const info = `stremio://${location.url.host}${
            location.url.host.endsWith('syncribullet')
              ? '.baby-beamup.club'
              : ''
          }/${encodeURI(configURL.join('|'))}/manifest.json`;
          nav(info);
        }}
      >
        {item.text}
      </Button>
    );
  });

  return (
    <>
      <div class="flex flex-col gap-6 justify-center items-center p-6 w-full min-h-screen">
        <h1 class="text-3xl font-bold md:text-6xl">
          <span class="bg-primary">S</span>
          <span class="bg-[#ed1c24]">y</span>
          <span class="bg-[#2e51a2]">n</span>
          <span class="bg-[#00cdff]">c</span>
          <span class="bg-[#FF5B38]">r</span>
          <span class="bg-[#0C0F11]">i</span>
          Bullet
        </h1>
        <div class="p-6 w-full max-w-2xl rounded-xl border shadow-xl border-outline/20 bg-secondary-container text-on-secondary-container">
          <h2 class="w-full text-xl font-bold text-center md:text-3xl">
            Receivers
          </h2>
          <div class="flex flex-col gap-6 pt-5 md:flex-row">
            <div class="w-full text-center">
              <h3 class="font-bold md:text-xl">Live Sync</h3>
              <div class="flex flex-wrap gap-2 justify-center pt-1 text-on-background">
                {liveSyncItems}
              </div>
            </div>
          </div>
        </div>
        {currentReceiver.value !== null ? (
          <div class="p-6 w-full max-w-2xl rounded-xl border shadow-xl border-outline/20 bg-secondary/20">
            <h2 class="w-full text-xl font-bold text-center md:text-3xl">
              {configuredReceivers[currentReceiver.value.id].receiver.text}
            </h2>
            <div class="flex flex-col gap-6 pt-5 md:flex-row">
              <div class="flex flex-col gap-4 w-full text-center">
                <div class="flex flex-col gap-2 items-center pt-1 text-on-background">
                  {configuredReceivers[currentReceiver.value.id].enabled ? (
                    <>
                      {currentReceiver.value.settings &&
                      currentReceiver.value.id === 'anilist' ? (
                        <ManifestSettings
                          data={currentReceiver.value.settings.data}
                          info={currentReceiver.value.settings.info}
                          id={currentReceiver.value.id}
                        >
                          <Button
                            backgroundColour="bg-error"
                            onClick$={() =>
                              removeAuthentication(currentReceiver.value?.id)
                            }
                          >
                            Remove Credentials
                          </Button>
                        </ManifestSettings>
                      ) : currentReceiver.value.settings &&
                        currentReceiver.value.id === 'simkl' ? (
                        <ManifestSettings
                          data={currentReceiver.value.settings.data}
                          info={currentReceiver.value.settings.info}
                          id={currentReceiver.value.id}
                        >
                          <Button
                            backgroundColour="bg-error"
                            onClick$={() =>
                              removeAuthentication(currentReceiver.value?.id)
                            }
                          >
                            Remove Credentials
                          </Button>
                        </ManifestSettings>
                      ) : (
                        <Button
                          backgroundColour="bg-error"
                          onClick$={() =>
                            removeAuthentication(currentReceiver.value?.id)
                          }
                        >
                          Remove Credentials
                        </Button>
                      )}
                    </>
                  ) : currentReceiver.value.id === 'anilist' ? (
                    <>
                      <AnilistLogin />
                    </>
                  ) : currentReceiver.value.id === 'simkl' ? (
                    <SimklLogin />
                  ) : currentReceiver.value.id === 'stremio' ? (
                    <StremioLogin />
                  ) : (
                    <></>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <></>
        )}
        {Object.values(configuredReceivers).filter(
          (item) => item.enabled && item.receiver.id !== 'stremio',
        ).length > 0 ? (
          <div class="p-6 w-full max-w-2xl rounded-xl border shadow-xl border-outline/20 bg-secondary-container text-on-secondary-container">
            <h2 class="w-full text-xl font-bold text-center md:text-3xl">
              Senders
            </h2>
            <div class="flex flex-col gap-6 pt-5 md:flex-row">
              <div class="w-full text-center">
                <h3 class="font-bold md:text-xl">Applications</h3>
                <div class="flex flex-wrap gap-2 justify-center pt-1 text-on-background">
                  {syncApplications}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <></>
        )}
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'SyncriBullet',
  meta: [
    {
      name: 'description',
      content: 'Mixing up synchronizisation',
    },
  ],
};
