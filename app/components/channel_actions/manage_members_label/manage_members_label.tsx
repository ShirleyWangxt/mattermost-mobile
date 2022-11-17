// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {removeMembersFromChannel} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import {dismissAllModals, dismissBottomSheet, popToRoot} from '@screens/navigation';

const messages = defineMessages({
    remove_title: {id: t('mobile.manage_members.remove_member'), defaultMessage: 'Remove Member'},
    remove_message: {
        id: t('mobile.manage_members.message.'),
        defaultMessage: 'Are you sure you want to remove the selected member from the channel?',
    },
    remove_cancel: {id: t('mobile.manage_members.cancel'), defaultMessage: 'Cancel'},
    remove_confirm: {id: t('mobile.manage_members.remove'), defaultMessage: 'Remove'},
});

type Props = {
    isOptionItem?: boolean;
    canLeave: boolean;
    channelId: string;
    manageOption?: string;
    testID?: string;
    userId: string;
}

const ManageMembersLabel = ({canLeave, channelId, isOptionItem, manageOption, testID, userId}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();

    const close = async () => {
        await dismissBottomSheet();
        if (!isTablet) {
            await dismissAllModals();
            popToRoot();
        }
    };

    // removeCurrentUserFromChannel (gekidou)
    // removeChannelMember (master)

    // const handleRemoveFromChannel = useCallback(async () => {
    //     removeFromChannel();
    // }, [userId, serverUrl]);

    // await dismissBottomSheet(Screens.USER_PROFILE);
    // X - 1. click remove
    // X - 2. verify want to remove user
    // 3. remove from remote server
    // 3a. check response
    // 4. if yes, remove from local
    // 5. close panel
    // 6 update the user list (should happen by database observe)
    // const {data} = await removeFromChannel(serverUrl, userId);
    // if (data) {
    //     switchToChannelById(serverUrl, data.id);
    // }
    const removeFromChannel = () => {
        Alert.alert(
            intl.formatMessage(messages.remove_title),
            intl.formatMessage(messages.remove_message),
            [{
                text: intl.formatMessage(messages.remove_cancel),
                style: 'cancel',
            }, {
                text: intl.formatMessage(messages.remove_confirm),
                style: 'destructive',
                onPress: async () => {
                    removeMembersFromChannel(serverUrl, channelId, false);
                    await dismissBottomSheet();
                },
            }], {cancelable: false},
        );
    };

    const onLeave = () => {
        switch (manageOption) {
            case General.MANAGE_MEMBERS_OPTIONS.REMOVE_USER:
                removeFromChannel();
                break;
        }
    };

    if (!canLeave) {
        return null;
    }

    let leaveText;
    let icon;
    switch (manageOption) {
        case General.MANAGE_MEMBERS_OPTIONS.REMOVE_USER:
            leaveText = intl.formatMessage(messages.remove_title);
            icon = 'trash-can-outline';
            break;
        default:
            leaveText = intl.formatMessage(messages.remove_title);
            icon = 'trash-can-outline';
            break;
    }

    if (isOptionItem) {
        return (
            <OptionItem
                action={onLeave}
                destructive={true}
                icon={icon}

                label={leaveText}
                testID={testID}
                type='default'
            />
        );
    }

    return (
        <SlideUpPanelItem
            destructive={true}
            icon={icon}
            onPress={onLeave}
            text={leaveText}
            testID={testID}
        />
    );
};

export default ManageMembersLabel;
