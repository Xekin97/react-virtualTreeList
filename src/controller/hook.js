export const useUpdate = () => {
	const [, setFlag] = useState();
	const update = () => {
	  setFlag(Date.now());
	};
	return update;
  };