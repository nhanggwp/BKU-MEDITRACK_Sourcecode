import { StyleSheet } from "react-native";

const color = {
  buttonBlue: "#006FFD",
  lightGrey: "#71727A",
  heavyGreen: "#007F00",
};

const text_based = {
  fontFamily: "Inter",
  fontStyle: "normal",
  color: "#0xFFF00000",
};

const headingBase = {
  ...text_based,
  fontWeight: "700",
  lineHeight: 25,
};

const globalStyles = StyleSheet.create({
  textBased: {
    ...text_based,
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 17,
  },

  textGrey: {
    ...text_based,
    color: "#71727A",
    fontWeight: "400",
  },

  textLink: {
    ...text_based,
    color: "#006FFD",
    fontWeight: "600",
    fontSize: 12,
  },

  headingThree: {
    ...headingBase,
    fontSize: 20,
    paddingVertical: 4,
  },

  headingTwo: {
    ...headingBase,
    fontSize: 24,
  },

  headingOne: {
    ...headingBase,
    fontSize: 30,
  },

  alignSelfCenter: {
    alignSelf: "center",
  },
  row: { flexDirection: "row" },
});

export default globalStyles;
