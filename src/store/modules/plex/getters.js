import { detect } from 'detect-browser';
import axios from 'axios';
import { difference, intersection } from 'lodash-es';
import { encodeUrlParams } from '@/utils/encoder';

function capitalizeFirstLetter(string) {
  return string[0].toUpperCase() + string.slice(1);
}

const browser = detect();

export default {
  getItemCache: (state) => state.itemCache,
  getLibraryCache: (state) => state.libraryCache,
  GET_SL_PLAYER: (state) => state.slPlayer,
  GET_CHOSEN_CLIENT: (state) => state.clients[state.chosenClientId],
  GET_CHOSEN_CLIENT_ID: (state) => state.chosenClientId,
  GET_RECENT_PLEX_CLIENTS: (state) => Object.values(state.clients)
    .sort((a, b) => -a.lastSeenAt.localeCompare(b.lastSeenAt)),

  GET_LAST_SERVER_ID: (state) => state.lastServerId,
  GET_LAST_SERVER: (state, getters) => getters.GET_PLEX_SERVER(getters.GET_LAST_SERVER_ID),
  GET_CONNECTABLE_PLEX_SERVERS: (state) => Object.values(state.servers).filter(
    (server) => server.chosenConnection,
  ),

  GET_PLEX_SERVERS: (state) => state.servers,
  GET_PLEX_SERVER_IDS: (state, getters) => Object.keys(getters.GET_PLEX_SERVERS),
  GET_PLEX_SERVER: (state, getters) => (machineIdentifier) => getters.GET_PLEX_SERVERS[machineIdentifier],

  IS_AUTHENTICATED: (state, getters, rootState, rootGetters) => !!rootGetters['settings/GET_PLEX_AUTH_TOKEN'] && getters.IS_USER_AUTHORIZED,

  GET_PLEX_PRODUCT_HEADER: () => 'SyncLounge',
  GET_PLEX_DEVICE_DEVICE_HEADER: () => browser.os,
  GET_PLEX_DEVICE_NAME_HEADER: () => capitalizeFirstLetter(browser.name),
  GET_PLEX_PLATFORM_HEADER: () => capitalizeFirstLetter(browser.name),

  GET_PLEX_INITIAL_AUTH_PARAMS: (state, getters, rootState, rootGetters) => ({
    'X-Plex-Product': getters.GET_PLEX_PRODUCT_HEADER,
    'X-Plex-Version': '4.34.3',
    'X-Plex-Client-Identifier': rootGetters['settings/GET_CLIENTIDENTIFIER'],
    'X-Plex-Platform': getters.GET_PLEX_PLATFORM_HEADER,
    'X-Plex-Platform-Version': browser.version,
    // 'X-Plex-Sync-Version': 2,
    // 'X-Plex-Features': 'external-media,indirect-media',
    'X-Plex-Model': 'hosted',
    'X-Plex-Device': getters.GET_PLEX_DEVICE_DEVICE_HEADER,
    'X-Plex-Device-Name': getters.GET_PLEX_DEVICE_NAME_HEADER,
    'X-Plex-Device-Screen-Resolution': `${window.screen.availWidth}x${window.screen.availHeight},${window.screen.width}x${window.screen.height}`,
    'X-Plex-Language': 'en',
  }),

  GET_PLEX_BASE_PARAMS: (state, getters, rootState, rootGetters) => (accessToken) => ({
    ...getters.GET_PLEX_INITIAL_AUTH_PARAMS,
    'X-Plex-Token': accessToken || rootGetters['settings/GET_PLEX_AUTH_TOKEN'],
  }),

  GET_PLEX_AUTH_URL: (state, getters, rootState, rootGetters) => (code) => {
    const urlParams = {
      'context[device][product]': getters.GET_PLEX_PRODUCT_HEADER,
      'context[device][environment]': 'bundled',
      'context[device][layout]': 'desktop',
      'context[device][platform]': getters.GET_PLEX_PLATFORM_HEADER,
      'context[device][device]': getters.GET_PLEX_DEVICE_DEVICE_HEADER,
      clientID: rootGetters['settings/GET_CLIENTIDENTIFIER'],
      code,
    };

    return `https://app.plex.tv/auth#?${encodeUrlParams(urlParams)}`;
  },

  IS_DONE_FETCHING_DEVICES: (state) => state.doneFetchingDevices,
  GET_DEVICE_FETCH_PROMISE: (state) => state.deviceFetchPromise,
  GET_PLEX_USER: (state) => state.user,
  IS_USER_AUTHORIZED: (state, getters) => getters.IS_PLEX_SERVER_AUTHORIZED
    || getters.IS_PLEX_USER_AUTHORIZED || getters.IS_AUTHENTICATION_TYPE_NONE,

  GET_UNBLOCKED_PLEX_SERVER_IDS: (state, getters, rootState, rootGetters) => difference(
    getters.GET_PLEX_SERVER_IDS,
    rootGetters['settings/GET_BLOCKEDSERVERS'],
  ),

  IS_PLEX_SERVER_UNBLOCKED: (state, getters) => (machineIdentifier) => getters
    .GET_UNBLOCKED_PLEX_SERVER_IDS.includes(machineIdentifier),

  GET_PLEX_SERVER_AXIOS: (state, getters) => (machineIdentifier) => {
    const server = getters.GET_PLEX_SERVER(machineIdentifier);

    return axios.create({
      baseURL: server.chosenConnection.uri,
      timeout: 5000,
      headers: getters.GET_PLEX_BASE_PARAMS(server.accessToken),
    });
  },

  IS_PLEX_SERVER_AUTHORIZED: (state, getters, rootState, rootGetters) => rootGetters['config/GET_AUTHENTICATION'].type.includes('server')
    && intersection(getters.GET_PLEX_SERVER_IDS, rootGetters['config/GET_AUTHENTICATION'].authorized).length > 0,

  IS_PLEX_USER_AUTHORIZED: (state, getters, rootState, rootGetters) => rootGetters['config/GET_AUTHENTICATION'].type.includes('user')
    && intersection(
      [getters.GET_PLEX_USER.username, getters.GET_PLEX_USER.email],
      rootGetters['config/GET_AUTHENTICATION'].authorized,
    ).length > 0,

  IS_AUTHENTICATION_TYPE_NONE: (state, getters, rootState, rootGetters) => rootGetters['config/GET_AUTHENTICATION'].type === 'none',
};
