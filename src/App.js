import './App.css';

import React from 'react';
import { Box, Button, Card, CardBody, CardFooter, Footer, Grommet, Header, Heading, Layer, Markdown, RangeSelector, Stack, Text, TextArea, TextInput } from 'grommet';
import { Edit, RadialSelected, Trash } from 'grommet-icons';

import { v4 as uuidv4 } from 'uuid';
import { fileOpen, fileSave } from 'browser-nativefs';
import filenamify from 'filenamify';

const theme = {
  global: {
    font: {
      family: 'Raleway',
    },
  },
};

class Flashcard extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      flipped: false,
    };
  }
  
  handleFlip() {
    this.setState({
      flipped: !this.state.flipped,
    });
  }

  render() {
    return (
      <div>
      <div className={'card-flip ' + (this.state.flipped ? 'flipped' : '')}>
        <div className="flip">
          <div className="front">
            <Card margin="small" background="light-1" width="medium" height={{ min: 'small' }}>
              <CardBody pad="medium" onClick={() => this.handleFlip()}>
                { this.props.editing ? <TextArea 
                    autoFocus
                    fill
                    resize="vertical"
                    value={this.props.front}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => this.props.onChangeFront(e)}
                  /> : <Markdown>
                    {this.props.front}
                  </Markdown>
                }
              </CardBody>
            </Card>
          </div>
          <div className="back">
            <Card margin="small" background="light-1" elevation="large" width="medium" height={{ min: 'small' }}>
              <CardBody pad="medium" onClick={() => this.handleFlip()}>
                { this.props.editing ? <TextArea 
                    autoFocus
                    fill
                    resize="vertical"
                    value={this.props.back}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => this.props.onChangeBack(e)}
                  /> : <Markdown>
                    {this.props.back}
                  </Markdown>
                }
              </CardBody>
              <CardFooter background="light-2" pad={{ horizontal: 'small' }} gap="xxsmall">
                <Button icon={<Edit />} hoverIndicator onClick={(e) => this.props.onClickEdit(e) } />
                <Button icon={<RadialSelected color="status-error" />} hoverIndicator />
                <Button icon={<RadialSelected color="status-warning" />} hoverIndicator />
                <Button icon={<RadialSelected color="status-ok" />} hoverIndicator />
                <Button icon={<Trash />} hoverIndicator onClick={() => this.props.onDelete()} />
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      </div>
    );
  }

} 

class Toast extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      show: true,
      timeout: null,
    };
  }

  hide() {
    if (this.state.timeout !== null) {
      clearTimeout(this.state.timeout);
    }

    this.setState({
      show: false,
      timeout: null,
    });
  }

  componentDidMount() {
    if (this.state.timeout === null) {
      this.setState({
        timeout: setTimeout(() => this.setState({ show: false }), 3000),
      });
    }
  }

  render() {
    return this.state.show && (
      <Layer position="bottom-left" margin="large" plain modal={false}>
        <Card direction="row" pad="medium" gap="large" align="baseline" background="dark-3" elevation="large">
          {this.props.text}
          <Box onClick={() => this.hide()}>
            {this.props.action}
          </Box>
        </Card>
      </Layer>
    );
  }
}

class App extends React.Component {

  constructor(props) {
    super(props);
    const cards = [
      {
        id: uuidv4(),
        front: "Hey!",
        back: "How's it going?",
        editing: false,
      },
      {
        id: uuidv4(),
        front: "Thank you for using the greatest flash cards app ever made.",
        back: "I promise",
        editing: false,
      },
      {
        id: uuidv4(),
        front: "Click cards to flip and edit them.",
        back: "Neat, right? Now go ahead and add a card!",
        editing: false,
      },
    ];
    this.state = {
      boxTitle: "Cards",
      cards: cards,
      notifications: [],
    };
  }

  notify(notification) {
    const addNotification = {
      id: uuidv4(),
      text: notification.text,
      action: notification.action,
    };

    this.setState({
      notifications: this.state.notifications.concat(addNotification),
    });
  }

  handleDelete(card) {
    const cardIndex = this.state.cards.findIndex(e => e === card);

    this.notify({
      text: (<Text>Card deleted</Text>),
      action: (<Button label="Undo" onClick={() => this.setState({ cards: this.state.cards.slice(0, cardIndex).concat(card).concat(this.state.cards.slice(cardIndex)) })} />),
    });

    this.setState({
      cards: this.state.cards.filter(c => (c !== card)),
    });
  }

  handleAdd() {
    this.setState({
      cards: this.state.cards.concat({
        id: uuidv4(),
        front: "",
        back: "",
        editing: true,
      }),
    });
  }

  handleEdit(card) {
    const cards = this.state.cards.map(c => (c === card ? { ...c, editing: !c.editing } : c ));
    this.setState({ cards: cards });
  }

  handleChangeFront(card, e) {
    const cards = this.state.cards.map(c => (c === card ? { ...c, front: e.target.value } : c ));
    this.setState({ cards: cards });
  }

  handleChangeBack(card, e) {
    const cards = this.state.cards.map(c => (c === card ? { ...c, back: e.target.value } : c ));
    this.setState({ cards: cards });
  }

  computeSaveState() {
    return ({
      boxTitle: this.state.boxTitle,
      cards: this.state.cards.map(c => ({
        id: c.id,
        front: c.front,
        back: c.back,
      })),
    });
  }

  handleSave() {
    fileSave(new Blob([JSON.stringify(this.computeSaveState())], {type: 'application/json'}), {
      fileName: filenamify(this.state.boxTitle, {replacement: '-'}) + '.json',
      extensions: ['.json'],
    });
  }

  async handleOpen() {
    const blob = await fileOpen({
      mimeTypes: ['application/json'],
    });

    if (blob === null) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      const result = JSON.parse(reader.result);
      this.setState({
        boxTitle: result.boxTitle,
        cards: result.cards.map(c => ({
          ...c,
          editing: false,
        })),
      });
    });
    reader.readAsText(blob);
  }

  render() {
    return (
      <Grommet theme={theme} full>
        <Box fill flex direction="column">
        
        <Header elevation="medium" background="brand" pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Heading level="3" margin="none">#cards</Heading>
          <Box direction="row" gap="small">
            <Button label="Open" onClick={() => this.handleOpen()} />
            <TextInput value={this.state.boxTitle} onChange={e => this.setState({ boxTitle: e.target.value })} />
            <Button label="Save" onClick={() => this.handleSave()} />
          </Box>
          <Button primary label="Add" onClick={() => this.handleAdd()} />
        </Header>

        <Box flex={{ grow: 1, shrink: 1 }} overflow="auto" pad="medium" direction="row" wrap justify="center">
          {this.state.cards.map(card => <Flashcard
            key={card.id}
            front={card.front}
            back={card.back}
            editing={card.editing}
            onClickEdit={() => this.handleEdit(card)}
            onChangeFront={(e) => this.handleChangeFront(card, e)}
            onChangeBack={(e) => this.handleChangeBack(card, e)}
            onDelete={() => this.handleDelete(card)}
          />)}
        </Box>

        {this.state.notifications.map(n => <Toast
          key={n.id}
          text={n.text}
          action={n.action}
        />)}

        <Footer pad="small" background="light-3" elevation="medium">
          
          <Stack anchor="top-right">
            <Button label="All" margin="xsmall" />
            <Box className="blurred" pad={{ horizontal: 'xsmall' }} round elevation="small">
              <Text>10</Text>
            </Box>
          </Stack>

          <Box pad="xxsmall" direction="row" gap="xxsmall" overflow="auto">

            <Stack anchor="top-right">
              <Button primary label="Hard" color="status-error" margin="xsmall" />
              <Box className="blurred" pad={{ horizontal: 'xsmall' }} round elevation="small">
                <Text>10</Text>
              </Box>
            </Stack>

            <Stack anchor="top-right">
              <Button label="Medium" color="status-warning" margin="xsmall" />
              <Box className="blurred" pad={{ horizontal: 'xsmall' }} round elevation="small">
                <Text>23</Text>
              </Box>
            </Stack>

            <Stack anchor="top-right">
              <Button label="Easy" color="status-ok" margin="xsmall" />
              <Box className="blurred" pad={{ horizontal: 'xsmall' }} round elevation="small">
                <Text>8</Text>
              </Box>
            </Stack>

            <Stack anchor="top-right">
              <Button primary label="#alpha" margin="xsmall" />
              <Box className="blurred" pad={{ horizontal: 'xsmall' }} round elevation="small">
                <Text>10</Text>
              </Box>
            </Stack>

            <Stack anchor="top-right">
              <Button label="#beta" margin="xsmall" />
              <Box pad={{ horizontal: 'xsmall' }} round elevation="small">
                <Text>23</Text>
              </Box>
            </Stack>

            <Stack anchor="top-right">
              <Button label="#gamma" margin="xsmall" />
              <Box pad={{ horizontal: 'xsmall' }} round elevation="small">
                <Text>8</Text>
              </Box>
            </Stack>

            <Stack anchor="top-right">
              <Button primary label="#delta" margin="xsmall" />
              <Box pad={{ horizontal: 'xsmall' }} round elevation="small">
                <Text>100</Text>
              </Box>
            </Stack>

            <Stack anchor="top-right">
              <Button primary label="#delta" margin="xsmall" />
              <Box pad={{ horizontal: 'xsmall' }} round elevation="small">
                <Text>100</Text>
              </Box>
            </Stack>

            <Stack anchor="top-right">
              <Button primary label="#delta" margin="xsmall" />
              <Box pad={{ horizontal: 'xsmall' }} round elevation="small">
                <Text>100</Text>
              </Box>
            </Stack>

            <Stack anchor="top-right">
              <Button primary label="#delta" margin="xsmall" />
              <Box pad={{ horizontal: 'xsmall' }} round elevation="small">
                <Text>100</Text>
              </Box>
            </Stack>

          </Box>
        </Footer>
        </Box>
      </Grommet>
    );
  }

}

export default App;
