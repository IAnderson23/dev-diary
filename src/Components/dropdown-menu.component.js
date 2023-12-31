import {createContext, forwardRef, useContext, useEffect, useRef, useState} from "react";
import {
  autoUpdate,
  flip, FloatingFocusManager, FloatingList, FloatingNode, FloatingPortal, FloatingTree,
  offset, safePolygon,
  shift, useClick, useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingTree, useHover, useInteractions,
  useListItem, useListNavigation, useMergeRefs, useRole, useTransitionStyles, useTypeahead
} from "@floating-ui/react";

const MenuContext = createContext({
  getItemProps: () => ({}),
  activeIndex: null,
  setActiveIndex: undefined,
  setHasFocusInside: undefined,
  isOpen: false
});

export const MenuComponent = forwardRef(({ children, label, ...props }, forwardedRef) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasFocusInside, setHasFocusInside] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  const elementsRef = useRef([]);
  const labelsRef = useRef([]);
  const parent = useContext(MenuContext);

  const tree = useFloatingTree();
  const nodeId = useFloatingNodeId();
  const parentId = useFloatingParentNodeId();
  const item = useListItem();

  const isNested = parentId != null;

  const { floatingStyles, refs, context } = useFloating({
    nodeId,
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: isNested ? "right-start" : "bottom-start",
    middleware: [
      offset({ mainAxis: isNested ? 0 : 4, alignmentAxis: isNested ? -4 : 0 }),
      flip(),
      shift()
    ],
    whileElementsMounted: autoUpdate
  });

  const {isMounted, styles: transitionStyles} = useTransitionStyles(context, {
    duration: 200
  });

  const hover = useHover(context, {
    enabled: isNested,
    delay: { open: 75 },
    handleClose: safePolygon({ blockPointerEvents: true })
  });
  const click = useClick(context, {
    event: "mousedown",
    toggle: !isNested,
    ignoreMouse: isNested
  });
  const role = useRole(context, { role: "menu" });
  const dismiss = useDismiss(context, { bubbles: true});
  const listNavigation = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    nested: isNested,
    onNavigate: setActiveIndex
  });
  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    onMatch: isOpen ? setActiveIndex : undefined,
    activeIndex
  });

  const {
    getReferenceProps,
    getFloatingProps,
    getItemProps
  } = useInteractions([hover, click, role, dismiss, listNavigation, typeahead]);

  // Event emitter allows you to communicate across tree components.
  // This effect closes all menus when an item gets clicked anywhere
  // in the tree.
  useEffect(() => {
    if (!tree) return;

    function handleTreeClick() {
      setIsOpen(false);
    }

    function onSubMenuOpen(event) {
      if (event.nodeId !== nodeId && event.parentId === parentId) {
        setIsOpen(false);
      }
    }

    tree.events.on("click", handleTreeClick);
    tree.events.on("menu-open", onSubMenuOpen);

    return () => {
      tree.events.off("click", handleTreeClick);
      tree.events.off("menu-open", onSubMenuOpen);
    };
  }, [tree, nodeId, parentId]);

  useEffect(() => {
    if (isOpen && tree) {
      tree.events.emit("menu-open", { parentId, nodeId });
    }
  }, [tree, isOpen, nodeId, parentId]);

  return (
    <FloatingNode id={nodeId}>
      <button
        ref={useMergeRefs([refs.setReference, item.ref, forwardedRef])}
        tabIndex={!isNested ? undefined : parent.activeIndex === item.index ? 0 : -1}
        role={isNested ? "menu-item" : undefined}
        data-open={isOpen ? "" : undefined}
        data-nested={isNested ? "" : undefined}
        data-focus-inside={hasFocusInside ? "" : undefined}
        className={isNested ? "menu-item" : "root-menu"}
        {...getReferenceProps(
          parent.getItemProps({
            ...props,
            onFocus:(event) => {
              props.onFocus?.(event);
              setHasFocusInside(false);
              parent.setHasFocusInside(true);
            }
          })
        )}
      >
        {label}
        {isNested && (
          <span aria-hidden style={{ marginLeft: 10, fontSize: 10 }}>
            ▶
          </span>
        )}
      </button>
      <MenuContext.Provider value={{getItemProps, activeIndex, setActiveIndex, setHasFocusInside, isOpen}}>
        <FloatingList elementsRef={elementsRef} labelsRef={labelsRef}>
          {isMounted && (
            <FloatingPortal>
              <FloatingFocusManager context={context} modal={false} initialFocus={isNested ? -1 : 0} returnFocus={!isNested}>
                <div className={"menu-container"} ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
                  <div className="menu" alignment={props.alignment} style={{...transitionStyles}} >
                    {children}
                  </div>
                </div>
              </FloatingFocusManager>
            </FloatingPortal>
          )}
        </FloatingList>
      </MenuContext.Provider>
    </FloatingNode>
  );
})

export const MenuItem = forwardRef(({ label, disabled, ...props }, forwardedRef) => {
  const menu = useContext(MenuContext);
  const item = useListItem({ label: disabled ? null : label });
  const tree = useFloatingTree();
  const isActive = item.index === menu.activeIndex;

  return (
    <button
      {...props}
      ref={useMergeRefs([item.ref, forwardedRef])}
      type="button"
      role="menuitem"
      className="menu-item"
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      {...menu.getItemProps({
        onClick: (event) => {
          props.onClick?.(event);
          tree?.events.emit("click");
        },
        onFocus: (event) => {
          props.onFocus?.(event);
          menu.setHasFocusInside(true);
        }
      })}
    >
      {label}
    </button>
  );
});

export const Menu = forwardRef((props, ref) => {
  const parentId = useFloatingParentNodeId();

  if (parentId === null) {
    return (
      <FloatingTree>
        <MenuComponent {...props} ref={ref} />
      </FloatingTree>
    );
  }

  return <MenuComponent {...props} ref={ref} />;
});