// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, Platform, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {fetchProfilesInChannel, fetchProfiles, searchProfiles} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import Search from '@components/search';
import UserList from '@components/user_list';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {ChannelModel} from '@database/models/server';
import {debounce} from '@helpers/api/general';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {dismissModal, setButtons} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername, filterProfilesMatchingTerm} from '@utils/user';

// import {displayUsername} from '@utils/user';

const messages = defineMessages({
    manage: {
        id: t('mobile.manage_members.manage'),
        defaultMessage: 'Manage',
    },
    done: {
        id: t('mobile.manage_members.done'),
        defaultMessage: 'Done',
    },
});

type Props = {
    componentId: string;
    currentChannel: ChannelModel;
    currentTeamId: string;
    currentUserId: string;
    teammateNameDisplay: string;
}

const MANAGE_BUTTON = 'manage-members';
const CLOSE_BUTTON = 'close-dms';

const close = () => {
    Keyboard.dismiss();
    dismissModal();
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        searchBar: {
            marginLeft: 12,
            marginRight: Platform.select({ios: 4, default: 12}),
            marginVertical: 12,
        },
        loadingContainer: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            height: 70,
            justifyContent: 'center',
        },
        loadingText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
        },
        noResultContainer: {
            flexGrow: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        noResultText: {
            fontSize: 26,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

function reduceProfiles(state: UserProfile[], action: {type: 'add'; values?: UserProfile[]}) {
    if (action.type === 'add' && action.values?.length) {
        return [...state, ...action.values];
    }
    return state;
}

export default function CreateDirectMessage({
    componentId,
    currentChannel,
    currentTeamId,
    currentUserId,
    teammateNameDisplay,
}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const intl = useIntl();
    const {formatMessage} = intl;

    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const next = useRef(true);
    const page = useRef(-1);
    const mounted = useRef(false);

    const [profiles, dispatchProfiles] = useReducer(reduceProfiles, []);
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [term, setTerm] = useState('');
    const [manageEnabled, setManageEnabled] = useState(true);

    // const [startingConversation, setStartingConversation] = useState(false);
    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});
    const selectedCount = Object.keys(selectedIds).length;
    const currentChannelId = currentChannel.id;

    const isSearch = Boolean(term);

    const loadedProfiles = ({users}: {users?: UserProfile[]}) => {
        if (mounted.current) {
            if (users && !users.length) {
                next.current = false;
            }

            page.current += 1;
            setLoading(false);
            dispatchProfiles({type: 'add', values: users});
        }
    };

    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
    }, []);

    const getProfiles = useCallback(debounce(() => {
        if (next.current && !loading && !term && mounted.current) {
            setLoading(true);
            fetchProfilesInChannel(serverUrl, currentChannelId).then(loadedProfiles);
        }
    }, 100), [loading, isSearch, serverUrl, currentTeamId]);

    const handleRemoveProfile = useCallback((id: string) => {
        const newSelectedIds = Object.assign({}, selectedIds);

        Reflect.deleteProperty(newSelectedIds, id);

        setSelectedIds(newSelectedIds);
    }, [selectedIds]);

    // const startConversation = useCallback(async (selectedId?: {[id: string]: boolean}) => {
    //     if (startingConversation) {
    //         return;
    //     }
    //
    //     setStartingConversation(true);
    //
    //     const idsToUse = selectedId ? Object.keys(selectedId) : Object.keys(selectedIds);
    //     let success;
    //     if (idsToUse.length === 0) {
    //         success = false;
    //     } else if (idsToUse.length > 1) {
    //         success = await createGroupChannel(idsToUse);
    //     } else {
    //         success = await createDirectChannel(idsToUse[0]);
    //     }
    //
    //     if (success) {
    //         close();
    //     } else {
    //         setStartingConversation(false);
    //     }
    // }, [startingConversation, selectedIds, createGroupChannel, createDirectChannel]);

    const handleSelectProfile = useCallback((user: UserProfile) => {

        // if (selectedIds[user.id]) {
        //     handleRemoveProfile(user.id);
        //     return;
        // }
        //
        // if (user.id === currentUserId) {
        //     const selectedId = {
        //         [currentUserId]: true,
        //     };
        //
        //     startConversation(selectedId);
        // } else {
        //     const wasSelected = selectedIds[user.id];
        //
        //     if (!wasSelected && selectedCount >= General.MAX_USERS_IN_GM) {
        //         return;
        //     }
        //
        //     const newSelectedIds = Object.assign({}, selectedIds);
        //     if (!wasSelected) {
        //         newSelectedIds[user.id] = user;
        //     }
        //
        //     setSelectedIds(newSelectedIds);
        //
        //     clearSearch();
        // }
    }, [selectedIds, currentUserId, handleRemoveProfile, clearSearch]);

    const searchUsers = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        setLoading(true);

        const results = await searchProfiles(serverUrl, lowerCasedTerm, {allow_inactive: true});

        let data: UserProfile[] = [];
        if (results.data) {
            data = results.data;
        }

        setSearchResults(data);
        setLoading(false);
    }, [serverUrl, currentTeamId]);

    const search = useCallback(() => {
        searchUsers(term);
    }, [searchUsers, term]);

    const onSearch = useCallback((text: string) => {
        if (text) {
            setTerm(text);
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
            }

            searchTimeoutId.current = setTimeout(() => {
                searchUsers(text);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            clearSearch();
        }
    }, [searchUsers, clearSearch]);

    const updateNavigationButtons = useCallback(async (enabled: boolean) => {
        // console.log('<> updagteNav <> manageEnabled, enabled', manageEnabled, enabled);
        const closeIcon = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        setButtons(componentId, {
            leftButtons: [{
                id: CLOSE_BUTTON,
                icon: closeIcon,
                testID: 'close.create_direct_message.button',
            }],
            rightButtons: [enabled ? {
                color: theme.sidebarHeaderTextColor,
                id: MANAGE_BUTTON,
                text: formatMessage({id: 'mobile.manage_members.manage', defaultMessage: 'Manage'}),
                showAsAction: 'always',
                enabled: true,
                testID: 'manage_members.manage.button',
            } : {
                color: theme.sidebarHeaderTextColor,
                id: MANAGE_BUTTON,
                text: formatMessage({id: 'mobile.manage_members.done', defaultMessage: 'Done'}),
                showAsAction: 'always',
                enabled: true,
                testID: 'manage_members.manage.button',
            }],
        });
    }, [intl.locale, theme, manageEnabled]);

    const toggleManage = useCallback(() => {
        // console.log('<> toggleManage - manageEnabled', manageEnabled);
        updateNavigationButtons(!manageEnabled);
        setManageEnabled(!manageEnabled);
    }, [manageEnabled]);

    useNavButtonPressed(MANAGE_BUTTON, componentId, toggleManage, [toggleManage]);
    useNavButtonPressed(CLOSE_BUTTON, componentId, close, [close]);

    useEffect(() => {
        mounted.current = true;
        updateNavigationButtons(manageEnabled);
        getProfiles();
        return () => {
            mounted.current = false;
        };
    }, []);

    // useEffect(() => {
    //     const canStart = selectedCount > 0 && !startingConversation;
    //     updateNavigationButtons(canStart);
    // }, [selectedCount > 0, startingConversation, updateNavigationButtons]);

    console.log('\n');
    console.log('<>  manageEnabled', manageEnabled);

    const data = useMemo(() => {
        if (term) {
            const exactMatches: UserProfile[] = [];
            const filterByTerm = (p: UserProfile) => {
                if (selectedCount > 0 && p.id === currentUserId) {
                    return false;
                }

                if (p.username === term || p.username.startsWith(term)) {
                    exactMatches.push(p);
                    return false;
                }

                return true;
            };

            const results = filterProfilesMatchingTerm(searchResults, term).filter(filterByTerm);
            return [...exactMatches, ...results];
        }
        return profiles;
    }, [term, isSearch && selectedCount, isSearch && searchResults, profiles]);

    return (
        <SafeAreaView
            style={style.container}
            testID='create_direct_message.screen'
        >
            <View style={style.searchBar}>
                <Search
                    testID='create_direct_message.search_bar'
                    placeholder={intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    cancelButtonTitle={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={onSearch}
                    onSubmitEditing={search}
                    onCancel={clearSearch}
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    value={term}
                />
            </View>
            <UserList
                currentUserId={currentUserId}
                handleSelectProfile={handleSelectProfile}
                loading={loading}
                manageMode={true}
                showManage={manageEnabled}
                profiles={data}
                selectedIds={selectedIds}
                showNoResults={!loading && page.current !== -1}
                teammateNameDisplay={teammateNameDisplay}
                fetchMore={getProfiles}
                term={term}
                testID='create_direct_message.user_list'

                tutorialWatched={true}
            />
        </SafeAreaView>
    );
}
