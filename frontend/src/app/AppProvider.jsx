import { Provider } from "react-redux";
import store from "../store/store.js";

const AppProvider = ({ children }) => {
  return <Provider store={store}>{children}</Provider>;
};

export default AppProvider;