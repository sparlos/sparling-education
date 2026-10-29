import { Menu as MantineMenu, UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./button.module.css";
import { cx } from "./cx";
import { Icon } from "./icon";
import menu from "./menu.module.css";
import press from "./press.module.css";
import type { Tone } from "./tone";

interface MenuItem {
  key: string;
  label: string;
  onClick(): void;
  /** Already chosen: shown with a tick. */
  checked?: boolean;
}

interface MenuProps {
  /** What the button that opens the menu says. */
  children: ReactNode;
  /** The opening button's look, as `Button`'s. */
  variant?: "secondary" | "subtle";
  tone?: Tone;
  /** Names the menu, shown above its items. */
  label: string;
  items: MenuItem[];
  /** Said after a checked item's label to a screen reader, e.g. ", already chosen". */
  checkedLabel?: string;
  disabled?: boolean;
}

/** A button that opens a list of actions, each one more tap away. */
export function Menu({
  children,
  variant = "secondary",
  tone = "brand",
  label,
  items,
  checkedLabel,
  disabled,
}: MenuProps) {
  // Every item keeps the tick's space when any can have one, so labels line up.
  const checkable = items.some((item) => item.checked !== undefined);
  return (
    // Kept showing while its button scrolls inside a container, like a
    // dashboard's sideways-scrolling grid.
    <MantineMenu
      position="bottom-start"
      shadow="md"
      disabled={disabled}
      hideDetached={false}
    >
      <MantineMenu.Target>
        <UnstyledButton
          type="button"
          disabled={disabled}
          data-size="md"
          data-tone={variant === "secondary" ? "neutral" : tone}
          className={cx(
            classes.root,
            variant === "subtle" ? classes.subtle : press.press,
          )}
        >
          {children}
        </UnstyledButton>
      </MantineMenu.Target>
      {/* In a portal, outside the page's tone: it takes the menu's own. */}
      <MantineMenu.Dropdown aria-label={label} data-tone={tone}>
        <MantineMenu.Label>{label}</MantineMenu.Label>
        {items.map((item) => (
          <MantineMenu.Item
            key={item.key}
            onClick={item.onClick}
            className={menu.item}
            data-checked={item.checked || undefined}
            leftSection={
              checkable && (
                <span className={menu.tick}>
                  {item.checked && <Icon name="check" size={20} />}
                </span>
              )
            }
          >
            {item.label}
            {item.checked && checkedLabel && (
              <span className={menu.hidden}>{checkedLabel}</span>
            )}
          </MantineMenu.Item>
        ))}
      </MantineMenu.Dropdown>
    </MantineMenu>
  );
}
