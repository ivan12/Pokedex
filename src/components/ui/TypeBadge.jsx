export const TypeBadge = ({ type }) => {
  return (
    <span
      className="type-badge"
      style={{
        backgroundColor: `hsl(var(--type-${type}))`
      }}
    >
      {type}
    </span>
  );
};

export default TypeBadge;
