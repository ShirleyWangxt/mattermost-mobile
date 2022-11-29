// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {KeyboardAvoidingView, LayoutChangeEvent, ScrollView, View} from 'react-native';
import Animated, {useAnimatedStyle, useDerivedValue, useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Toast from '@components/toast';
import {BOTTOM_TAB_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet, useKeyboardHeight} from '@hooks/device';
import Button from '@screens/bottom_sheet/button';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SelectedUser, {USER_CHIP_BOTTOM_MARGIN, USER_CHIP_HEIGHT} from './selected_user';

type Props = {

    /*
     * An object mapping user ids to a falsey value indicating whether or not they have been selected.
     */
    selectedIds: {[id: string]: UserProfile};

    /*
     * How to display the names of users.
     */
    teammateNameDisplay: string;

    /*
     * A handler function that will deselect a user when clicked on.
     */
    onPress: (selectedId?: {[id: string]: boolean}) => void;

    /*
     * A handler function that will deselect a user when clicked on.
     */
    onRemove: (id: string) => void;

    /*
     * show the toast
     */
    showToast: boolean;

    /*
     * toast Icon
     */
    toastIcon?: string;

    /*
     * toast Message
     */
    toastMessage: string;

    /*
     * callback to set the value of showToast
     */
    setShowToast: (show: boolean) => void;

    /*
     * Name of the button Icon
     */
    buttonIcon: string;

    /*
     * Text displayed on the action button
     */
    buttonText: string;
}

const BUTTON_HEIGHT = 48;
const CHIP_HEIGHT_WITH_MARGIN = USER_CHIP_HEIGHT + USER_CHIP_BOTTOM_MARGIN;
const EXPOSED_CHIP_HEIGHT = 0.33 * USER_CHIP_HEIGHT;
const MAX_CHIP_ROWS = 3;
const SCROLL_PADDING_TOP = 20;
const SCROLL_VIEW_MAX_HEIGHT = SCROLL_PADDING_TOP + (CHIP_HEIGHT_WITH_MARGIN * MAX_CHIP_ROWS) + EXPOSED_CHIP_HEIGHT;
const TABLET_MARGIN_BOTTOM = 20;
const TOAST_BOTTOM_MARGIN = 8;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            borderBottomWidth: 0,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderWidth: 1,
            elevation: 4,
            maxHeight: SCROLL_VIEW_MAX_HEIGHT + BUTTON_HEIGHT,
            overflow: 'hidden',
            paddingHorizontal: 20,
            shadowColor: theme.centerChannelColor,
            shadowOffset: {
                width: 0,
                height: 8,
            },
            shadowOpacity: 0.16,
            shadowRadius: 24,
        },
        toast: {
            backgroundColor: theme.centerChannelColor,
        },
        users: {
            paddingTop: SCROLL_PADDING_TOP,
            paddingBottom: 12,
            flexDirection: 'row',
            flexGrow: 1,
            flexWrap: 'wrap',
        },
        message: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 12,
            marginRight: 5,
            marginTop: 10,
            marginBottom: 2,
        },
    };
});

export default function SelectedUsers({
    selectedIds,
    teammateNameDisplay,
    showToast = false,
    toastIcon,
    toastMessage,
    onPress,
    onRemove,
    buttonIcon,
    buttonText,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const isTablet = useIsTablet();
    const keyboardHeight = useKeyboardHeight();
    const insets = useSafeAreaInsets();

    const scrollViewHeight = useSharedValue(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(Boolean(Object.keys(selectedIds).length));
    }, [selectedIds]);

    const handleOnPress = async () => {
        onPress();
    };

    const users = useMemo(() => {
        const u = [];
        for (const id of Object.keys(selectedIds)) {
            if (!selectedIds[id]) {
                continue;
            }

            u.push(
                <SelectedUser
                    key={id}
                    user={selectedIds[id]}
                    teammateNameDisplay={teammateNameDisplay}
                    onRemove={onRemove}
                    testID='create_direct_message.selected_user'
                />,
            );
        }
        return u;
    }, [selectedIds, teammateNameDisplay, onRemove]);

    const marginBottom = useMemo(() => {
        if (!keyboardHeight) {
            return isTablet ? TABLET_MARGIN_BOTTOM : 0;
        }

        let margin = BOTTOM_TAB_HEIGHT + BUTTON_HEIGHT + insets.bottom;
        margin += isTablet ? 0 : -10;
        return margin;
    }, [insets.bottom, isTablet, keyboardHeight]);

    const totalPanelHeight = useDerivedValue(() => (
        isVisible ? scrollViewHeight.value + BUTTON_HEIGHT : 0
    ), [isVisible]);

    const animatedViewStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(totalPanelHeight.value, {duration: 200}),
            marginBottom,
        };
    }, [marginBottom]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        scrollViewHeight.value = Math.min(SCROLL_VIEW_MAX_HEIGHT, e.nativeEvent.layout.height);
    }, []);

    const contents = (
        <Animated.View style={[style.container, animatedViewStyle]}>
            <ScrollView style={{height: scrollViewHeight.value}}>
                <View
                    style={style.users}
                    onLayout={onLayout}
                >
                    {users}
                </View>
            </ScrollView>
            <Button
                onPress={handleOnPress}
                icon={buttonIcon}
                text={buttonText}
            />
        </Animated.View>
    );

    const animatedToastStyle = useAnimatedStyle(() => {
        return {
            bottom: TOAST_BOTTOM_MARGIN +
                totalPanelHeight.value +
                marginBottom,
            opacity: withTiming(showToast ? 1 : 0, {duration: 300}),
            position: 'absolute',
        };
    }, [showToast, marginBottom]);

    const toast = useMemo(() => (
        <Toast
            animatedStyle={animatedToastStyle}
            iconName={toastIcon}
            style={style.toast}
            message={toastMessage}
        />
    ), [animatedToastStyle]);

    return (
        <KeyboardAvoidingView
            behavior='position'
        >
            {showToast && toast}
            {contents}
        </KeyboardAvoidingView>
    );
}

