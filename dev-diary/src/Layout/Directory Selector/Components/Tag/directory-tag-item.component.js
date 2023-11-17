import {useAtom} from "jotai";

import {directoryConstructor} from "../../../../Utility/Constructors/directory-constructor.utility";
import {directoryAtom} from "../../../../Atoms/Directory/directory.atom";
import {tagIcon} from "../../../../Assets/svg-icons.asset";

function DirectoryTagItem({tag}) {
  const [directory, setDirectory] = useAtom(directoryAtom);

  function activeChecker(target) {
    return directory.type === "tag" && directory.target === target ? "active" : "";
  }

  function onClickHandler(target) {
    setDirectory(directoryConstructor.tag(target))
  }

  return (
    <li className={"directory-item " + activeChecker(tag)}>
      <div className={"item-header"} onClick={() => onClickHandler(tag)}>
        {tagIcon}
        <p className={"item-name"}>{tag}</p>
      </div>
    </li>
  )
}

export default DirectoryTagItem;