// api/APIFunction.js
import axios from 'axios';
import { SERVER } from '../config/appConfig';

const API = axios.create({
  baseURL: SERVER.apiBaseUrl,
  timeout: 20000,
});

function buildParams({ date, vrn, role, limit, openAlertOnly, zone } = {}) {
  const params = {};
  if (date) params.date = date;
  if (vrn?.trim()) params.vrn = vrn.trim();
  if (role) params.role = role;
  if (limit != null) params.limit = limit;
  // Without this the top/bottom requests are identical unzoned queries and
  // a busy day's top rows push every bottom row out of the capped response
  if (zone) params.zone = zone;
  if (openAlertOnly === true || openAlertOnly === 'true') {
    params.openAlertOnly = true;
  }
  return params;
}

async function getData(path, params) {
  const response = await API.get(path, { params });
  return response.data;
}

/**
 * Security alerts. `zone` keeps top and bottom on separate budgets — bottom
 * rows are rare next to top rows, so one capped request can come back with a
 * busy day's newest top rows and none of that day's bottom rows at all.
 */
export const getAlerts = async (date, vrn, limit, zone) => {
  return getData('/alerts/all', buildParams({ date, vrn, limit, zone }));
};

/** @deprecated use getAlerts */
export const getAllAlerts = async date => getAlerts(date);

/** Open alerts — date optional */
export const getOpenAlerts = async (date, vrn, limit, zone) => {
  return getData('/open-alerts/all', buildParams({ date, vrn, limit, zone }));
};

export const getDefaultOpenAlert = async vrn => getOpenAlerts(undefined, vrn);

export const getSelectedOpenAlert = async (date, vrn) =>
  getOpenAlerts(date, vrn);

/** Comparison logs — open-alert history for admin UI */
export const getComparisonLogs = async (
  date,
  vrn,
  limit = 150,
  openAlertOnly = true,
) => {
  return getData(
    '/comparison-logs',
    buildParams({ date, vrn, limit, openAlertOnly }),
  );
};

/** Latest packets (supports IST date filter) */
export const getLatestPackets = async (vrn, role, limit = 100, date) => {
  return getData('/packets/latest', buildParams({ vrn, role, limit, date }));
};

/** Canonical monitor summary counts for selected IST date */
export const getMonitorSummary = async (date, vrn) => {
  return getData('/monitor/summary', buildParams({ date, vrn }));
};

/** Live sensor health per vehicle (10-minute fault threshold) */
export const getSensorStatus = async (vrn) => {
  return getData('/monitor/sensor-status', buildParams({ vrn }));
};
