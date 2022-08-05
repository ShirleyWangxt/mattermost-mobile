// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';

import {fetchStatusInBatch, updateMe} from '@actions/remote/user';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {popTopScreen, setButtons} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getNotificationProps} from '@utils/user';

import {getSaveButton} from '../config';
import SettingContainer from '../setting_container';
import SettingOption from '../setting_option';
import SettingSeparator from '../settings_separator';

import type UserModel from '@typings/database/models/servers/user';

const label = {
    id: t('notification_settings.auto_responder.message'),
    defaultMessage: 'Message',
};

const OOO = {
    id: t('notification_settings.auto_responder.default_message'),
    defaultMessage: 'Hello, I am out of office and unable to respond to messages.',
};
const SAVE_OOO_BUTTON_ID = 'notification_settings.auto_responder.save.button';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        input: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
            flex: 1,
        },
        textInputContainer: {
            width: '91%',
            marginTop: 20,
            alignSelf: 'center',
            height: 154,
        },
        footer: {
            paddingHorizontal: 20,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 75, 'Regular'),
            marginTop: 20,
        },
    };
});

type NotificationAutoResponderProps = {
    componentId: string;
    currentUser: UserModel;
}
const NotificationAutoResponder = ({currentUser, componentId}: NotificationAutoResponderProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const notifyProps = useMemo(() => getNotificationProps(currentUser), []); // dependency array should remain empty

    const initialAutoResponderActive = useMemo(() => Boolean(currentUser.status === General.OUT_OF_OFFICE && notifyProps.auto_responder_active === 'true'), []); // dependency array should remain empty
    const [autoResponderActive, setAutoResponderActive] = useState<boolean>(initialAutoResponderActive);

    const initialOOOMsg = useMemo(() => notifyProps.auto_responder_message || intl.formatMessage(OOO), []); // dependency array should remain empty
    const [autoResponderMessage, setAutoResponderMessage] = useState<string>(initialOOOMsg);

    const styles = getStyleSheet(theme);

    const close = () => popTopScreen(componentId);

    const saveButton = useMemo(() => getSaveButton(SAVE_OOO_BUTTON_ID, intl, theme.sidebarHeaderTextColor), [theme.sidebarHeaderTextColor]);

    const saveAutoResponder = useCallback(() => {
        updateMe(serverUrl, {
            notify_props: {
                ...notifyProps,
                auto_responder_active: `${autoResponderActive}`,
                auto_responder_message: autoResponderMessage,
            },
        });
        fetchStatusInBatch(serverUrl, currentUser.id);
        close();
    }, [serverUrl, autoResponderActive, autoResponderMessage, notifyProps, currentUser.id]);

    useEffect(() => {
        const enabled = initialAutoResponderActive !== autoResponderActive || initialOOOMsg !== autoResponderMessage;
        const buttons = {
            rightButtons: [{
                ...saveButton,
                enabled,
            }],
        };
        setButtons(componentId, buttons);
    }, [autoResponderActive, autoResponderMessage, componentId, currentUser.status, notifyProps.auto_responder_message]);

    useNavButtonPressed(SAVE_OOO_BUTTON_ID, componentId, saveAutoResponder, [saveAutoResponder]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SettingContainer>
            <SettingOption
                label={intl.formatMessage({id: 'notification_settings.auto_responder.to.enable', defaultMessage: 'Enable automatic replies'})}
                action={setAutoResponderActive}
                type='toggle'
                selected={autoResponderActive}
            />
            <SettingSeparator/>
            {autoResponderActive && (
                <FloatingTextInput
                    allowFontScaling={true}
                    autoCapitalize='none'
                    autoCorrect={false}
                    containerStyle={styles.textInputContainer}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    label={intl.formatMessage(label)}
                    multiline={true}
                    onChangeText={setAutoResponderMessage}
                    placeholder={intl.formatMessage(label)}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                    returnKeyType='default'
                    textAlignVertical='top'
                    textInputStyle={styles.input}
                    theme={theme}
                    underlineColorAndroid='transparent'
                    value={autoResponderMessage || ''}
                />
            )}
            <FormattedText
                id={'notification_settings.auto_responder.footer.message'}
                defaultMessage={'Set a custom message that is automatically sent in response to direct messages, such as an out of office or vacation reply. Enabling this setting changes your status to Out of Office and disables notifications.'}
                style={styles.footer}
            />
        </SettingContainer>
    );
};

export default NotificationAutoResponder;