// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchFilteredChannelGroups, fetchFilteredTeamGroups, fetchGroupsForAutocomplete} from '@actions/remote/groups';
import DatabaseManager from '@database/manager';
import {prepareGroups, queryGroupsByName, queryGroupsByNameInChannel, queryGroupsByNameInTeam} from '@queries/servers/group';
import {logError} from '@utils/log';

import type GroupModel from '@typings/database/models/servers/group';

export const searchGroupsByName = async (serverUrl: string, name: string): Promise<GroupModel[]> => {
    let database;

    try {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    } catch (e) {
        logError('searchGroupsByName - DB Error', e);
        return [];
    }

    try {
        const groups = await fetchGroupsForAutocomplete(serverUrl, name);

        if (groups && Array.isArray(groups)) {
            return groups;
        }
        throw groups.error;
    } catch (e) {
        logError('searchGroupsByName - ERROR', e);
        return queryGroupsByName(database, name).fetch();
    }
};

export const searchGroupsByNameInTeam = async (serverUrl: string, name: string, teamId: string): Promise<GroupModel[]> => {
    let database;

    try {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('searchGroupsByNameInTeam - DB Error', e);
        return [];
    }

    try {
        const groups = await fetchFilteredTeamGroups(serverUrl, name, teamId);

        if (groups && Array.isArray(groups)) {
            return groups;
        }
        throw groups.error;
    } catch (e) {
        logError('searchGroupsByNameInTeam - ERROR', e);
        return queryGroupsByNameInTeam(database, name, teamId).fetch();
    }
};

export const searchGroupsByNameInChannel = async (serverUrl: string, name: string, channelId: string): Promise<GroupModel[]> => {
    let database;

    try {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('searchGroupsByNameInChannel - DB Error', e);
        return [];
    }

    try {
        const groups = await fetchFilteredChannelGroups(serverUrl, name, channelId);

        if (groups && Array.isArray(groups)) {
            return groups;
        }
        throw groups.error;
    } catch (e) {
        logError('searchGroupsByNameInChannel - ERROR', e);
        return queryGroupsByNameInChannel(database, name, channelId).fetch();
    }
};

/**
 * Store fetched groups locally
 *
 * @param serverUrl string - The Server URL
 * @param groups Group[] - The groups fetched from the API
 */
export const storeGroups = async (serverUrl: string, groups: Group[]) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const preparedGroups = await prepareGroups(operator, groups);

        if (preparedGroups.length) {
            operator.batchRecords(preparedGroups);
        }

        return preparedGroups;
    } catch (e) {
        return {error: e};
    }
};
