import type { ThemeConfig } from 'antd';

// Color palette
export const lcColors = {
  // Text colors
  textPrimary: '#37352F',     // Dark gray for primary text
  textSecondary: '#787774',   // Medium gray for secondary text
  textTertiary: '#9B9A97',    // Light gray for tertiary text

  // Background colors
  bgBase: '#FFFFFF',          // Pure white for cards
  bgPage: '#FBFBFA',          // Off-white for page background
  bgSidebar: '#F7F6F3',       // Light cream for sidebar
  bgHover: '#F1F0EE',         // Subtle hover state
  bgActive: '#E9E8E6',        // Subtle active state

  // Border colors
  borderPrimary: '#E9E9E7',   // Subtle border
  borderSecondary: '#EDECE9', // Even more subtle border

  // Accent colors (very subtle, not bright)
  accentBlue: '#0B6E99',      // Muted blue
  accentGreen: '#0F7B6C',     // Muted green
  accentRed: '#E03E3E',       // Muted red
  accentOrange: '#D9730D',    // Muted orange
};

export const lcTheme: ThemeConfig = {
  token: {
    // Color tokens
    colorPrimary: lcColors.textPrimary,
    colorText: lcColors.textPrimary,
    colorTextSecondary: lcColors.textSecondary,
    colorTextTertiary: lcColors.textTertiary,
    colorBorder: lcColors.borderPrimary,
    colorBorderSecondary: lcColors.borderSecondary,
    colorBgContainer: lcColors.bgBase,
    colorBgLayout: lcColors.bgPage,

    // Typography
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"',
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,

    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingXL: 32,
    margin: 16,
    marginLG: 24,
    marginXL: 32,

    // Border radius (Uses subtle rounded corners)
    borderRadius: 3,
    borderRadiusLG: 6,
    borderRadiusSM: 2,

    // Shadows (very subtle)
    boxShadow: 'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px',
    boxShadowSecondary: 'rgba(15, 15, 15, 0.1) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 2px 4px',

    // Line height
    lineHeight: 1.5,
    lineHeightHeading1: 1.2,
    lineHeightHeading2: 1.2,
    lineHeightHeading3: 1.3,
  },
  components: {
    Layout: {
      bodyBg: lcColors.bgPage,
      headerBg: lcColors.bgBase,
      siderBg: lcColors.bgSidebar,
      triggerBg: lcColors.bgActive,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: lcColors.bgActive,
      itemSelectedColor: lcColors.textPrimary,
      itemHoverBg: lcColors.bgHover,
      itemHoverColor: lcColors.textPrimary,
      itemActiveBg: lcColors.bgActive,
      itemColor: lcColors.textSecondary,
      iconSize: 18,
      iconMarginInlineEnd: 12,
      itemBorderRadius: 3,
      itemHeight: 36,
      itemPaddingInline: 12,
    },
    Button: {
      // Primary button (used sparingly)
      primaryColor: lcColors.bgBase,
      primaryBg: lcColors.textPrimary,
      colorPrimaryHover: '#000000',

      // Default button
      defaultBg: lcColors.bgBase,
      defaultColor: lcColors.textPrimary,
      defaultBorderColor: lcColors.borderPrimary,
      defaultHoverBg: lcColors.bgHover,
      defaultHoverColor: lcColors.textPrimary,
      defaultHoverBorderColor: lcColors.borderPrimary,

      // Text button
      textHoverBg: lcColors.bgHover,

      // Danger button
      dangerColor: lcColors.accentRed,
      colorErrorHover: '#D03232',

      borderRadius: 3,
      controlHeight: 32,
      controlHeightLG: 36,
      paddingContentHorizontal: 16,
    },
    Card: {
      borderRadiusLG: 3,
      boxShadow: 'none',
      headerBg: 'transparent',
      paddingLG: 24,
      colorBorderSecondary: lcColors.borderSecondary,
      actionsBg: 'transparent',
    },
    Input: {
      borderRadius: 3,
      hoverBorderColor: lcColors.borderPrimary,
      activeBorderColor: lcColors.textPrimary,
      activeShadow: 'none',
      controlHeight: 36,
      paddingBlock: 8,
      paddingInline: 12,
    },
    Select: {
      borderRadius: 3,
      controlHeight: 36,
    },
    Modal: {
      borderRadiusLG: 6,
      paddingContentHorizontalLG: 24,
      paddingMD: 24,
    },
    Table: {
      borderColor: lcColors.borderSecondary,
      headerBg: lcColors.bgPage,
      rowHoverBg: lcColors.bgHover,
    },
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0,
    },
    Spin: {
      colorPrimary: lcColors.textSecondary,
    },
    Tag: {
      borderRadiusSM: 2,
      defaultBg: lcColors.bgHover,
      defaultColor: lcColors.textSecondary,
    },
    Empty: {
      colorTextDisabled: lcColors.textTertiary,
    },
  },
};
